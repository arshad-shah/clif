/**
 * clif/symbols — Shared printable glyphs.
 *
 * The status icons (✔ ✖ ⚠ ℹ), prompt markers, and box-drawing characters were
 * previously re-typed across the log helpers, spinner, prompts, and table/box
 * renderers. Centralising them keeps the visual language consistent and means a
 * glyph only ever changes in one place.
 */

import { type Formatter, cyan, green, red, yellow } from "./colors.js";

/** Semantic UI glyphs used by log output, spinners, and prompts. */
export const symbols = {
  success: "✔",
  error: "✖",
  warning: "⚠",
  info: "ℹ",
  /** Generic bullet — list markers and the debug log prefix. */
  bullet: "●",
  /** Leading marker for an interactive question. */
  question: "?",
  /** Active-row / input pointer. */
  pointer: "❯",
  /** Checked / unchecked checkbox in a multi-select. */
  radioOn: "◉",
  radioOff: "○",
} as const;

/** Single-line box-drawing characters shared by `box` and `table`. */
export const boxChars = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  teeDown: "┬",
  teeUp: "┴",
  teeRight: "├",
  teeLeft: "┤",
  cross: "┼",
} as const;

/** Connectors used by the `tree` renderer to draw the branch gutter. */
export const treeChars = {
  /** Branch leading to a non-final child. */
  branch: "├── ",
  /** Branch leading to the final child. */
  lastBranch: "└── ",
  /** Continuation gutter for descendants of a non-final child. */
  vertical: "│   ",
  /** Blank gutter for descendants of the final child. */
  indent: "    ",
} as const;

/** The four colored status kinds and the formatter each conventionally uses. */
export type StatusKind = "success" | "error" | "warning" | "info";

const STATUS_COLOR: Record<StatusKind, Formatter> = {
  success: green,
  error: red,
  warning: yellow,
  info: cyan,
};

/**
 * A status glyph painted in its conventional color. Resolved lazily at call
 * time, so it always reflects the current color level.
 */
export function statusIcon(kind: StatusKind): string {
  return STATUS_COLOR[kind](symbols[kind]);
}
