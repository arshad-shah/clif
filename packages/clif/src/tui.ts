/**
 * clif/tui — Tiny full-screen terminal UI runtime.
 *
 * Separated from the main entry so the core bundle stays tiny when no TUI is
 * used. The runtime is imperative: you own the state, return a frame string
 * from `render`, and handle keys — clif drives the alternate screen, raw input,
 * a line-diff repaint, and a bulletproof terminal restore on exit.
 *
 * @example
 * ```ts
 * import { createApp, createList } from "clif/tui";
 *
 * const menu = createList({
 *   items: ["Build", "Test", "Deploy"],
 *   height: 10,
 * });
 *
 * const app = createApp({
 *   render: () => `Pick a task:\n\n${menu.render()}\n\n${"↑/↓ move · enter run · q quit"}`,
 *   onKey: (key, app) => {
 *     if (menu.handleKey(key)) return app.rerender();
 *     if (key.name === "enter" || key.char === "q") app.exit();
 *   },
 * });
 *
 * await app.run();
 * ```
 */

export { createApp, TuiError } from "./tui/app.js";
export type {
  App,
  AppOptions,
  AppHandle,
  Size,
  TuiErrorCode,
} from "./tui/app.js";

export type { Key, KeyName } from "./tui/keys.js";

export { createList, createViewport, createTextInput } from "./tui/components.js";
export type {
  List,
  ListOptions,
  Viewport,
  ViewportOptions,
  TextInput,
  TextInputOptions,
} from "./tui/components.js";
