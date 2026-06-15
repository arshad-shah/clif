/**
 * clif/ansi — Terminal control sequences (cursor movement + line erase).
 *
 * These CSI codes are independent of color/SGR styling: spinners, progress
 * bars, and interactive prompts use them to repaint in place. Centralised so
 * the raw escape literals (`\x1b[…`) live in exactly one place rather than
 * being re-typed across every renderer.
 */

/** Control Sequence Introducer — the `ESC [` prefix every code below shares. */
const CSI = "\x1b[";

/** Hide the cursor (used while a spinner animates). */
export const CURSOR_HIDE = `${CSI}?25l`;

/** Show the cursor again (restored on spinner stop / cleanup). */
export const CURSOR_SHOW = `${CSI}?25h`;

/** Erase from the cursor to the end of the line. Does not move the cursor. */
export const ERASE_LINE = `${CSI}K`;

/**
 * Return to column 0 and erase the line — the canonical "repaint this row"
 * prefix. Equivalent to `\r` followed by {@link ERASE_LINE}.
 */
export const CLEAR_LINE = `\r${ERASE_LINE}`;

/** Move the cursor up `n` rows (default 1). */
export function cursorUp(n = 1): string {
  return `${CSI}${n}A`;
}

/** Move up one row and clear it — overwrite the line just printed. */
export const CLEAR_PREV_LINE = `${cursorUp(1)}${CLEAR_LINE}`;

// ── Full-screen control (TUI runtime) ────────────────────────────────────────
//
// The codes below are only used by full-screen apps (`clif/tui`). Inline
// renderers — spinners, progress, prompts — never move the cursor absolutely or
// switch screen buffers, so these stay separate from the line-oriented codes.

/**
 * Switch to the alternate screen buffer. A full-screen app paints here so the
 * user's shell scrollback is left untouched and restored on exit.
 */
export const ALT_SCREEN_ENTER = `${CSI}?1049h`;

/** Leave the alternate screen buffer, restoring the prior terminal contents. */
export const ALT_SCREEN_EXIT = `${CSI}?1049l`;

/** Erase the entire screen. Does not move the cursor. */
export const ERASE_SCREEN = `${CSI}2J`;

/** Erase from the cursor to the end of the screen. */
export const ERASE_DOWN = `${CSI}J`;

/** Move the cursor to the home position (row 1, column 1). */
export const CURSOR_HOME = `${CSI}H`;

/** Move the cursor to an absolute `(row, col)`, both 1-based. */
export function cursorTo(row = 1, col = 1): string {
  return `${CSI}${row};${col}H`;
}
