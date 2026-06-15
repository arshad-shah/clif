/**
 * clif/tui/renderer — Line-diff frame painter.
 *
 * A full-screen app produces a complete frame (a newline-separated string) on
 * every render. Re-writing the whole screen each time flickers and is wasteful,
 * so this painter keeps the previous frame and emits cursor-addressed updates
 * for only the rows that actually changed. Line granularity (rather than
 * per-cell) keeps the diff tiny while eliminating the common case of repainting
 * an unchanged screen.
 */

import { CLEAR_LINE, ERASE_DOWN, cursorTo } from "../core/ansi.js";
import { visibleLength } from "../core/colors.js";
import { truncate } from "../utils/helpers.js";

/** Clamp a line to `cols` visible columns (ANSI-aware), without an ellipsis. */
function clampLine(line: string, cols: number): string {
  return visibleLength(line) > cols ? truncate(line, cols, "") : line;
}

export interface Renderer {
  /** Diff `frame` against the last paint and write only the changed rows. */
  paint(frame: string, cols: number): void;
  /** Forget the previous frame so the next paint rewrites every row. */
  reset(): void;
}

export function createRenderer(write: (s: string) => void): Renderer {
  let last: string[] = [];

  return {
    paint(frame: string, cols: number): void {
      const next = frame.split("\n").map((line) => clampLine(line, cols));

      let out = "";
      for (let i = 0; i < next.length; i++) {
        if (next[i] !== last[i]) {
          out += cursorTo(i + 1, 1) + CLEAR_LINE + next[i];
        }
      }

      // The new frame is shorter — erase the rows the old one left behind.
      if (last.length > next.length) {
        out += cursorTo(next.length + 1, 1) + ERASE_DOWN;
      }

      if (out) write(out);
      last = next;
    },

    reset(): void {
      last = [];
    },
  };
}
