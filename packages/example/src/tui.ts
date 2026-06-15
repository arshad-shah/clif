/**
 * TUI demos for the `kit` example CLI.
 *
 * These take over the screen — run them one at a time in an interactive
 * terminal. `kit tui showcase` is the flagship: a responsive two-pane
 * dashboard that composes every TUI system (the app runtime, list, viewport,
 * and text input) with Tab focus-switching, live filtering, and a layout that
 * re-flows on resize. The others (`menu`, `input`, `viewport`) exercise a
 * single widget in isolation.
 */

import {
  bold,
  cyan,
  dim,
  gradient,
  gray,
  green,
  inverse,
  visibleLength,
  wordWrap,
} from "@arshad-shah/clif";
import {
  type Size,
  createApp,
  createList,
  createTextInput,
  createViewport,
} from "@arshad-shah/clif/tui";

// ── Shared layout helpers ─────────────────────────────────────────────────────

const EMBER = ["#f5c76a", "#f59e0b"] as const;

/** A full-width horizontal rule. */
const rule = (width: number) => gray("─".repeat(Math.max(0, width)));

/** Pad a (possibly ANSI-styled) line to `width` visible columns. */
function pad(line: string, width: number): string {
  const gap = width - visibleLength(line);
  return gap > 0 ? line + " ".repeat(gap) : line;
}

/** Place `left` at the start and `right` flush to the right edge of `width`. */
function spread(left: string, right: string, width: number): string {
  const gap = width - visibleLength(left) - visibleLength(right);
  return gap > 0 ? left + " ".repeat(gap) + right : left;
}

// ── Showcase: a composed, responsive dashboard ────────────────────────────────

interface Feature {
  name: string;
  tagline: string;
  body: string;
  bullets: string[];
}

const FEATURES: Feature[] = [
  {
    name: "Colors & Styles",
    tagline: "Truecolor that downgrades gracefully",
    body: "Chainable, immutable style builders plus per-character gradients and OSC 8 hyperlinks. Truecolor and 256-color automatically step down to the nearest renderable color on weaker terminals instead of dropping out.",
    bullets: ["style.red.bold(text)", "gradient([...])(text)", "hex / rgb / 256-color"],
  },
  {
    name: "Boxes & Layout",
    tagline: "Framed content with alignment & padding",
    body: "Draw rounded, single, double, or bold boxes with titles, padding, margins, and alignment — all returned as plain strings you can compose, like the two panes you're looking at right now.",
    bullets: ["5 border styles", "title + alignment", "ANSI-aware width math"],
  },
  {
    name: "Tables & Trees",
    tagline: "Structured data, beautifully aligned",
    body: "Render tables with per-column alignment, key/value blocks, bullet lists, and nested trees. Columns measure visible width so ANSI styling never throws the alignment off.",
    bullets: ["table(rows)", "keyValue(data)", "tree(root)"],
  },
  {
    name: "Spinners & Progress",
    tagline: "Live feedback, CI-safe",
    body: "Spinners and progress bars repaint in place on a TTY and degrade to plain newline output in CI logs and files — no cursor-control spam where it can't be seen.",
    bullets: ["createSpinner()", "createProgress()", "auto non-TTY fallback"],
  },
  {
    name: "Task Runner",
    tagline: "Hierarchical steps with live status",
    body: "Orchestrate a tree of steps with per-step status, skip reasons, and concurrent children. On a TTY it animates an indented tree; elsewhere it prints ordered plain output.",
    bullets: ["nested sub-steps", "concurrent groups", "skip / fail handling"],
  },
  {
    name: "Prompts",
    tagline: "Zero-dependency interactive input",
    body: "Text, password, confirm, number, single- and multi-select, all driven by raw stdin and composable with group(). Each rejects cleanly on Ctrl+C or a non-TTY stream.",
    bullets: ["select / multiselect", "validation + defaults", "group() composition"],
  },
  {
    name: "TUI Runtime",
    tagline: "Full-screen apps in a few KB",
    body: "createApp drives the alternate screen, a line-diff repaint that rewrites only changed rows, coalesced renders, resize handling, and a bulletproof terminal restore on exit, Ctrl+C, or crash.",
    bullets: ["line-diff repaint", "resize-aware layout", "guaranteed teardown"],
  },
  {
    name: "Key Decoder",
    tagline: "Robust streaming input",
    body: "Decodes arrows, Home/End, Page keys, Tab/Shift+Tab, and Ctrl combinations — and reassembles escape sequences even when the terminal splits them across two reads.",
    bullets: ["split-sequence safe", "Ctrl+letter combos", "app-cursor mode"],
  },
  {
    name: "Widgets",
    tagline: "Composable building blocks",
    body: "List, viewport, and text input are small stateful objects with render() / handleKey(). They don't own the loop, so any number of them nest into a larger layout — exactly how this dashboard is built.",
    bullets: ["createList", "createViewport", "createTextInput"],
  },
];

/** Build the rich right-pane content for a feature, wrapped to `width`. */
function detailFor(feature: Feature, width: number): string {
  const w = Math.max(12, width);
  const lines: string[] = [];
  lines.push(bold(gradient([...EMBER])(feature.name)));
  lines.push(dim(feature.tagline));
  lines.push("");
  lines.push(...wordWrap(feature.body, w).split("\n"));
  lines.push("");
  lines.push(dim("Highlights"));
  for (const b of feature.bullets) {
    lines.push(...wordWrap(`${green("✔")} ${b}`, w).split("\n"));
  }
  return lines.join("\n");
}

export async function tuiShowcase(): Promise<void> {
  const names = FEATURES.map((f) => f.name);
  const leftWidth = Math.min(26, Math.max(...names.map((n) => n.length)) + 4);
  const CHROME = 5; // header + rule + search + rule + footer

  let focus: "search" | "list" | "detail" = "list";

  // Highlight the active row, but only brightly when the list itself is focused.
  const listFormat = (item: string, info: { selected: boolean }) =>
    info.selected
      ? `${focus === "list" ? cyan("❯") : dim("❯")} ${focus === "list" ? cyan(item) : bold(item)}`
      : `  ${item}`;

  const search = createTextInput({ placeholder: "filter features…" });
  let list = createList({ items: names, height: 1, format: listFormat });
  let detail = createViewport({ content: "", height: 1 });

  const filtered = () => {
    const q = search.value.trim().toLowerCase();
    return q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
  };

  const refreshDetail = (size: Size) => {
    const f = FEATURES.find((x) => x.name === list.selected);
    detail.setContent(
      f ? detailFor(f, size.cols - leftWidth - 3) : dim("No match — clear the filter."),
    );
  };

  // Rebuild the size-dependent widgets when the terminal geometry changes.
  // Guarded so it's a no-op unless rows/cols actually moved (also handles the
  // very first paint, since the initial dimensions are unknown).
  let lastCols = -1;
  let lastRows = -1;
  const relayout = (size: Size) => {
    if (size.cols === lastCols && size.rows === lastRows) return;
    lastCols = size.cols;
    lastRows = size.rows;
    const bodyHeight = Math.max(3, size.rows - CHROME);
    list = createList({
      items: filtered(),
      height: bodyHeight,
      selectedIndex: list.selectedIndex,
      format: listFormat,
    });
    const scroll = detail.scroll;
    detail = createViewport({ content: "", height: bodyHeight });
    refreshDetail(size);
    detail.scrollTo(scroll);
  };

  const app = createApp({
    render: (size) => {
      relayout(size);
      const bodyHeight = Math.max(3, size.rows - CHROME);

      const title = `${bold(gradient([...EMBER])("clif"))} ${dim("· tui showcase")}`;
      const header = spread(title, dim(`${size.cols}×${size.rows}`), size.cols);

      const marker = focus === "search" ? cyan("❯") : dim("·");
      const searchLine = `${marker} ${dim("search")} ${search.render()}`;

      const leftLines = list.render().split("\n");
      const rightLines = detail.render().split("\n");
      const sep = focus === "detail" ? cyan("│") : dim("│");
      const body: string[] = [];
      for (let i = 0; i < bodyHeight; i++) {
        body.push(`${pad(leftLines[i] ?? "", leftWidth)} ${sep} ${rightLines[i] ?? ""}`);
      }

      const focusName = { search: "SEARCH", list: "LIST", detail: "DETAIL" }[focus];
      const footer = spread(
        inverse(` ${focusName} `),
        dim("Tab focus · ↑/↓ move · / search · Enter open · q quit"),
        size.cols,
      );

      return [header, rule(size.cols), searchLine, rule(size.cols), ...body, footer].join("\n");
    },

    onResize: (size) => relayout(size),

    onKey: (key, app) => {
      // Tab / Shift+Tab cycles focus across the three panes.
      if (key.name === "tab" || key.name === "backtab") {
        const order = ["search", "list", "detail"] as const;
        const dir = key.name === "backtab" ? -1 : 1;
        focus = order[(order.indexOf(focus) + dir + order.length) % order.length]!;
        return app.rerender();
      }

      if (focus === "search") {
        if (key.name === "enter" || key.name === "escape") {
          focus = "list";
          return app.rerender();
        }
        if (search.handleKey(key)) {
          list.setItems(filtered());
          refreshDetail(app.size);
          app.rerender();
        }
        return;
      }

      if (focus === "list") {
        if (key.char === "/") {
          focus = "search";
          return app.rerender();
        }
        if (key.name === "enter") {
          focus = "detail";
          return app.rerender();
        }
        if (list.handleKey(key)) {
          refreshDetail(app.size);
          return app.rerender();
        }
        if (key.char === "q" || key.name === "escape") app.exit();
        return;
      }

      // focus === "detail"
      if (detail.handleKey(key)) return app.rerender();
      if (key.name === "escape") {
        focus = "list";
        return app.rerender();
      }
      if (key.char === "q") app.exit();
    },
  });

  await app.run();
  const chosen = list.selected;
  if (chosen) process.stdout.write(`You explored: ${chosen}\n`);
}

// ── Focused single-widget demos ───────────────────────────────────────────────

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
