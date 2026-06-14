/**
 * clif/tasks — Hierarchical task runner.
 *
 * `createTaskList` orchestrates a tree of steps (a run is a step, with embedded
 * sub-steps) and renders their live status. On a TTY it repaints an indented
 * tree in place, animating a spinner on running steps; in a non-TTY stream (CI
 * logs, files) it degrades to plain, ordered, newline-terminated output with no
 * cursor-control sequences.
 */

import { CLEAR_LINE, CURSOR_HIDE, CURSOR_SHOW, cursorUp } from "../core/ansi.js";
import { type Formatter, cyan, dim } from "../core/colors.js";
import { statusIcon, symbols } from "../core/symbols.js";

const TASK_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function isStreamTTY(stream: NodeJS.WritableStream): boolean {
  return "isTTY" in stream && (stream as { isTTY?: boolean }).isTTY === true;
}

export type TaskStatus = "pending" | "running" | "success" | "failed" | "skipped";

/** Handle passed to a task body for interacting with its own step. */
export interface TaskContext {
  /** Replace this step's label while it runs (e.g. progress detail). */
  update(text: string): void;
}

export interface TaskNode {
  title: string;
  /** Work to run for this step. Receives a {@link TaskContext}. */
  task?: (ctx: TaskContext) => void | Promise<void>;
  /** Embedded sub-steps, run after this step's own `task` (if any). */
  children?: TaskNode[];
  /**
   * Decide whether to skip. Return a string to record a reason (rendered next
   * to the ⊘ glyph), `true` to skip silently, or a falsy value to run.
   */
  skip?: () => boolean | string | Promise<boolean | string>;
  /** Run this node's children concurrently instead of in sequence. */
  concurrent?: boolean;
}

export interface TaskListOptions {
  /** Run the top-level steps concurrently instead of in sequence. */
  concurrent?: boolean;
  /** Keep going after a step fails, collecting errors, instead of aborting. */
  continueOnError?: boolean;
  interval?: number;
  color?: Formatter;
  stream?: NodeJS.WritableStream;
}

export interface TaskListResult {
  ok: boolean;
  errors: { title: string; error: Error }[];
}

interface TaskState {
  node: TaskNode;
  title: string;
  label: string;
  status: TaskStatus;
  reason?: string;
  error?: Error;
  depth: number;
  children: TaskState[];
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

function buildState(node: TaskNode, depth: number): TaskState {
  return {
    node,
    title: node.title,
    label: node.title,
    status: "pending",
    depth,
    children: (node.children ?? []).map((c) => buildState(c, depth + 1)),
  };
}

export function createTaskList(tasks: TaskNode[], opts: TaskListOptions = {}) {
  const {
    interval = 80,
    color = cyan,
    stream = process.stderr,
    continueOnError = false,
    concurrent: rootConcurrent = false,
  } = opts;
  const tty = isStreamTTY(stream);

  const roots = tasks.map((t) => buildState(t, 0));
  const errors: { title: string; error: Error }[] = [];
  let frameIdx = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let lastLineCount = 0;

  function iconFor(state: TaskState): string {
    switch (state.status) {
      case "running":
        return color(TASK_FRAMES[frameIdx % TASK_FRAMES.length]!);
      case "success":
        return statusIcon("success");
      case "failed":
        return statusIcon("error");
      case "skipped":
        return dim(symbols.skipped);
      default:
        return dim(symbols.radioOff);
    }
  }

  function lineFor(state: TaskState): string {
    const text = state.status === "running" ? state.label : state.title;
    let suffix = "";
    if (state.status === "skipped" && state.reason) suffix = dim(` (${state.reason})`);
    else if (state.status === "failed" && state.error) suffix = dim(` — ${state.error.message}`);
    return `${"  ".repeat(state.depth)}${iconFor(state)} ${text}${suffix}`;
  }

  function collectLines(states: TaskState[], out: string[]): void {
    for (const s of states) {
      out.push(lineFor(s));
      collectLines(s.children, out);
    }
  }

  /** Repaint the whole tree in place (TTY only). */
  function paint(): void {
    const lines: string[] = [];
    collectLines(roots, lines);
    if (lastLineCount > 0) stream.write(cursorUp(lastLineCount));
    for (const line of lines) stream.write(`${CLEAR_LINE}${line}\n`);
    lastLineCount = lines.length;
  }

  // Non-TTY: emit a single plain line per state transition, preserving order.
  function logLine(state: TaskState): void {
    stream.write(`${lineFor(state)}\n`);
  }

  function onChange(state: TaskState): void {
    if (tty) paint();
    else logLine(state);
  }

  async function runState(state: TaskState, aborted: () => boolean): Promise<void> {
    if (!continueOnError && aborted()) return;

    if (state.node.skip) {
      const verdict = await state.node.skip();
      if (verdict) {
        state.status = "skipped";
        if (typeof verdict === "string") state.reason = verdict;
        onChange(state);
        return;
      }
    }

    state.status = "running";
    onChange(state);

    const ctx: TaskContext = {
      update(text: string) {
        state.label = text;
        if (tty) paint();
      },
    };

    try {
      if (state.node.task) await state.node.task(ctx);
    } catch (e) {
      const error = toError(e);
      state.status = "failed";
      state.error = error;
      errors.push({ title: state.title, error });
      onChange(state);
      if (!continueOnError) throw error;
      return; // a failed step does not run its children
    }

    if (state.children.length > 0) {
      await runGroup(state.children, state.node.concurrent ?? false, aborted);
    }

    if (state.status === "running") {
      state.status = "success";
      onChange(state);
    }
  }

  async function runGroup(
    states: TaskState[],
    isConcurrent: boolean,
    aborted: () => boolean,
  ): Promise<void> {
    if (isConcurrent) {
      const settled = await Promise.allSettled(states.map((s) => runState(s, aborted)));
      // Surface the first rejection so an aborting run propagates upward.
      const failure = settled.find((r) => r.status === "rejected");
      if (failure && failure.status === "rejected" && !continueOnError) throw failure.reason;
      return;
    }
    for (const s of states) {
      if (!continueOnError && aborted()) break;
      await runState(s, aborted);
    }
  }

  return {
    async run(): Promise<TaskListResult> {
      let aborted = false;
      const isAborted = () => aborted;

      if (tty) {
        stream.write(CURSOR_HIDE);
        paint();
        timer = setInterval(() => {
          // Advance the spinner animation on running steps, then repaint.
          frameIdx++;
          paint();
        }, interval);
      }

      let fatal: Error | undefined;
      try {
        await runGroup(roots, rootConcurrent, isAborted);
      } catch (e) {
        aborted = true;
        fatal = toError(e);
      }

      if (timer) clearInterval(timer);
      timer = null;
      if (tty) {
        paint(); // final frame with settled icons
        stream.write(CURSOR_SHOW);
      }

      if (fatal) throw fatal;
      return { ok: errors.length === 0, errors };
    },
  };
}
