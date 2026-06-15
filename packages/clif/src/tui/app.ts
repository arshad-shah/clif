/**
 * clif/tui/app — Full-screen application runtime.
 *
 * `createApp` owns the imperative loop: enter the alternate screen + raw mode,
 * render the caller's frame, diff it onto the screen, route decoded keys, and —
 * critically — tear everything down (cursor, raw mode, screen buffer) on exit,
 * Ctrl+C, or a crash so the user's terminal is never left broken.
 *
 * State lives in the caller's closure; the runtime only drives rendering and
 * input, which keeps it tiny and framework-agnostic.
 */

import {
  ALT_SCREEN_ENTER,
  ALT_SCREEN_EXIT,
  CURSOR_HIDE,
  CURSOR_HOME,
  CURSOR_SHOW,
  ERASE_SCREEN,
} from "../core/ansi.js";
import { type StdinLike, type StdoutLike, enterRawMode, toChunk } from "../core/tty.js";
import { type Key, createKeyDecoder } from "./keys.js";
import { createRenderer } from "./renderer.js";

// ── Error type ──────────────────────────────────────────────────────────────

export type TuiErrorCode = "not-a-tty";

export class TuiError extends Error {
  readonly code: TuiErrorCode;
  constructor(code: TuiErrorCode, message?: string) {
    super(message ?? code);
    this.name = "TuiError";
    this.code = code;
  }
}

// ── Injectable stdio (used by tests) ─────────────────────────────────────────

interface Stdio {
  stdin: StdinLike;
  stdout: StdoutLike;
}

let stdio: Stdio | null = null;

function getStdio(): Stdio {
  return stdio ?? { stdin: process.stdin, stdout: process.stdout };
}

/** Test-only escape hatch. Not part of the public API. */
export const __testing = {
  setStdio(s: Stdio): void {
    stdio = s;
  },
  resetStdio(): void {
    stdio = null;
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

/** Current terminal dimensions, in character cells. */
export interface Size {
  rows: number;
  cols: number;
}

/** Handle passed to key handlers for driving the running app. */
export interface AppHandle {
  /** Current terminal size (updated on resize). */
  readonly size: Size;
  /** Request a repaint. Multiple calls within a frame are coalesced into one. */
  rerender(): void;
  /** Tear down and resolve `run()` with `code` (default 0). */
  exit(code?: number): void;
}

export interface AppOptions {
  /** Produce the full screen for the given size, as a newline-separated string. */
  render: (size: Size) => string;
  /** Handle a decoded keypress. Ctrl+C still exits unless you call `exit` yourself. */
  onKey?: (key: Key, app: AppHandle) => void;
  /** Notified after a terminal resize, before the repaint. */
  onResize?: (size: Size) => void;
  /** Run once during teardown (success or error). */
  onExit?: () => void;
  /** Use the alternate screen buffer (default `true`). */
  fullscreen?: boolean;
  /** Maximum repaints per second (default `30`). Coalesces bursts of `rerender`. */
  fps?: number;
}

export interface App {
  /** Start the loop. Resolves with the exit code when `exit` is called. */
  run(): Promise<number>;
}

export function createApp(opts: AppOptions): App {
  const fullscreen = opts.fullscreen ?? true;
  const fps = opts.fps && opts.fps > 0 ? opts.fps : 30;
  const frameMs = Math.max(1, Math.round(1000 / fps));

  return {
    run(): Promise<number> {
      const { stdin, stdout } = getStdio();
      if (!stdin.isTTY) {
        throw new TuiError(
          "not-a-tty",
          "Cannot run a TUI: stdin is not a TTY. Run in an interactive terminal.",
        );
      }
      // Only wire process-level signal/exit guards for the real process streams;
      // injected (test) stdio drives teardown explicitly.
      const isRealProcess = stdin === process.stdin;
      const write = (s: string) => stdout.write(s);

      const size: Size = {
        rows: stdout.rows ?? 24,
        cols: stdout.columns ?? 80,
      };

      return new Promise<number>((resolve, reject) => {
        const renderer = createRenderer(write);
        const decoder = createKeyDecoder();
        const restoreMode = enterRawMode(stdin);

        let scheduled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let done = false;

        const doRender = () => {
          if (done) return;
          renderer.paint(opts.render(size), size.cols);
        };

        const rerender = () => {
          if (done || scheduled) return;
          scheduled = true;
          timer = setTimeout(() => {
            scheduled = false;
            timer = null;
            doRender();
          }, frameMs);
        };

        const handle: AppHandle = {
          get size() {
            return size;
          },
          rerender,
          exit: (code = 0) => finish(code),
        };

        const onData = (data: Buffer | string) => {
          for (const k of decoder.push(toChunk(data))) {
            opts.onKey?.(k, handle);
            // Ctrl+C always exits — a TUI without its own handler must still quit.
            if (!done && k.ctrl && k.char === "c") finish(130);
            if (done) return;
          }
        };

        const onResize = () => {
          size.rows = stdout.rows ?? size.rows;
          size.cols = stdout.columns ?? size.cols;
          opts.onResize?.(size);
          // Geometry changed under us: drop the cached frame and repaint clean.
          renderer.reset();
          if (fullscreen) write(ERASE_SCREEN + CURSOR_HOME);
          doRender();
        };

        const onSigint = () => finish(130);

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          stdin.off("data", onData);
          (stdout as unknown as NodeJS.EventEmitter).off?.("resize", onResize);
          if (isRealProcess) {
            process.off("SIGINT", onSigint);
            process.off("exit", restoreTerminal);
          }
          restoreTerminal();
        };

        // Synchronous terminal restore — also runs on `process.exit`.
        const restoreTerminal = () => {
          restoreMode();
          if (fullscreen) write(ALT_SCREEN_EXIT);
          write(CURSOR_SHOW);
        };

        const finish = (code: number) => {
          if (done) return;
          done = true;
          cleanup();
          opts.onExit?.();
          resolve(code);
        };

        try {
          if (fullscreen) write(ALT_SCREEN_ENTER + ERASE_SCREEN + CURSOR_HOME);
          write(CURSOR_HIDE);

          stdin.on("data", onData);
          (stdout as unknown as NodeJS.EventEmitter).on?.("resize", onResize);
          if (isRealProcess) {
            process.on("SIGINT", onSigint);
            process.on("exit", restoreTerminal);
          }

          doRender();
        } catch (err) {
          if (!done) {
            done = true;
            cleanup();
            opts.onExit?.();
          }
          reject(err);
        }
      });
    },
  };
}
