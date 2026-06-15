/**
 * TUI demos for the `kit` example CLI.
 *
 * Unlike the renderer demos, these take over the screen — run them one at a
 * time in an interactive terminal (`kit tui menu`, `kit tui input`).
 */

import { bold, cyan, dim, green } from "@arshad-shah/clif";
import { createApp, createList, createTextInput, createViewport } from "@arshad-shah/clif/tui";

const FOOTER = dim("↑/↓ move · enter select · q quit");

/** A scrollable single-select menu built on `createList`. */
export async function tuiMenu(): Promise<void> {
  const list = createList({
    items: ["Build", "Test", "Lint", "Typecheck", "Release", "Docs", "Clean"],
    height: 5,
  });
  let chosen: string | null = null;

  const app = createApp({
    render: () =>
      [
        bold("Pick a task"),
        "",
        list.render(),
        "",
        FOOTER,
        chosen ? green(`\n✔ ran: ${chosen}`) : "",
      ].join("\n"),
    onKey: (key, app) => {
      if (list.handleKey(key)) return app.rerender();
      if (key.name === "enter") {
        chosen = list.selected ?? null;
        app.rerender();
      }
      if (key.char === "q") app.exit();
    },
  });

  await app.run();
  if (chosen) process.stdout.write(`Selected: ${chosen}\n`);
}

/** A single-line text field built on `createTextInput`. */
export async function tuiInput(): Promise<void> {
  const input = createTextInput({ placeholder: "type your name…" });

  const app = createApp({
    render: () =>
      [
        bold("What's your name?"),
        "",
        `${cyan("❯")} ${input.render()}`,
        "",
        dim("enter to submit"),
      ].join("\n"),
    onKey: (key, app) => {
      if (key.name === "enter") return app.exit();
      if (input.handleKey(key)) app.rerender();
    },
  });

  await app.run();
  process.stdout.write(`Hello, ${input.value || "stranger"}!\n`);
}

/** A scrollable read-only viewport built on `createViewport`. */
export async function tuiViewport(): Promise<void> {
  const lines = Array.from(
    { length: 40 },
    (_, i) => `${String(i + 1).padStart(3)}  log line ${i + 1}`,
  );
  const vp = createViewport({ content: lines, height: 10 });

  const app = createApp({
    render: () =>
      [bold("Log viewer"), "", vp.render(), "", dim("↑/↓ scroll · PgUp/PgDn page · q quit")].join(
        "\n",
      ),
    onKey: (key, app) => {
      if (vp.handleKey(key)) return app.rerender();
      if (key.char === "q") app.exit();
    },
  });

  await app.run();
}
