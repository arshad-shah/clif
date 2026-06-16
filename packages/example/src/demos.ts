/**
 * Non-interactive renderer demos.
 * Each function returns void and writes directly to stdout/stderr so the
 * caller can sequence them or pick one.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  type TreeNode,
  banner,
  bgBlue,
  bgHex,
  bgRgb,
  black,
  blue,
  bold,
  box,
  compose,
  createProgress,
  createSpinner,
  createTaskList,
  cyan,
  cyanBright,
  dedent,
  dim,
  divider,
  formatBytes,
  formatDuration,
  gradient,
  green,
  hex,
  indent,
  inverse,
  isTTY,
  italic,
  keyValue,
  link,
  list,
  log,
  magenta,
  red,
  rgb,
  strikethrough,
  stripAnsi,
  style,
  table,
  terminalWidth,
  tree,
  truncate,
  underline,
  visibleLength,
  wordWrap,
  yellow,
} from "@arshad-shah/clif";
// The FIGfont engine lives on the opt-in `/banner` subpath. clif ships no
// fonts, so we load one ourselves from `fonts/Slant.flf` (see demoFiglet).
import { figlet, parseFont } from "@arshad-shah/clif/banner";

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function section(title: string): void {
  process.stdout.write(`\n${divider({ label: title, color: cyan })}\n\n`);
}

export function demoColors(): void {
  section("colors — basic & bright");
  process.stdout.write(
    `${[
      red("red"),
      green("green"),
      yellow("yellow"),
      blue("blue"),
      magenta("magenta"),
      cyan("cyan"),
    ].join("  ")}\n`,
  );
  process.stdout.write(
    `${[
      cyanBright("cyanBright"),
      bold("bold"),
      dim("dim"),
      italic("italic"),
      underline("underline"),
      inverse("inverse"),
      strikethrough("strike"),
    ].join("  ")}\n`,
  );

  section("colors — backgrounds & truecolor");
  process.stdout.write(
    `${[
      bgBlue(black(" bg blue ")),
      bgRgb(80, 30, 120)(" rgb(80,30,120) "),
      bgHex("#d4860b")(black(" #d4860b ")),
    ].join(" ")}\n`,
  );
  process.stdout.write(`${[hex("#f5c76a")("ember"), rgb(212, 134, 11)("copper")].join("  ")}\n`);

  section("colors — compose");
  const headline = compose(bold, underline, hex("#f5c76a"));
  process.stdout.write(`${headline("composed: bold + underline + hex")}\n`);

  section("colors — chainable style");
  process.stdout.write(
    `${[
      style.red.bold("style.red.bold"),
      style.bgBlue.white(" style.bgBlue.white "),
      style.hex("#f5c76a").underline("style.hex().underline"),
    ].join("  ")}\n`,
  );

  section("colors — gradient");
  process.stdout.write(`${gradient(["#ff0080", "#7928ca"])("smooth two-stop gradient")}\n`);
  process.stdout.write(`${bold(gradient(["#f00", "#0f0", "#00f"])("multi-stop rainbow text"))}\n`);
  process.stdout.write(
    `${gradient([
      [255, 0, 128],
      [121, 40, 202],
    ])("gradient from [r, g, b] tuple stops")}\n`,
  );

  section("colors — hyperlink (OSC 8)");
  process.stdout.write(`${link("clif docs", "https://clif.arshadshah.com")}\n`);
}

export function demoBox(): void {
  section("box — every border style");
  for (const border of ["single", "double", "round", "bold"] as const) {
    process.stdout.write(
      `${box(`border = ${bold(border)}`, { border, title: border, borderColor: cyan })}\n`,
    );
  }

  section("box — alignment");
  for (const align of ["left", "center", "right"] as const) {
    process.stdout.write(
      `${box(`aligned ${align}`, {
        border: "round",
        align,
        width: 40,
        title: align,
        titleColor: yellow,
      })}\n`,
    );
  }

  section("box — padding, margin & dimmed border");
  process.stdout.write(
    `${box("padding: 2, dimBorder: true", {
      border: "round",
      padding: 2,
      margin: 1,
      dimBorder: true,
      borderColor: cyan,
    })}\n`,
  );
}

export function demoTable(): void {
  section("table");
  const rows: string[][] = [
    [bold("Name"), bold("Lang"), bold("Stars")],
    ["clif", "TypeScript", "★ new"],
    ["commander", "JavaScript", "26k"],
    ["chalk", "JavaScript", "22k"],
    ["ora", "TypeScript", "9k"],
  ];
  process.stdout.write(`${table(rows)}\n`);

  section("table — per-column alignment");
  process.stdout.write(
    `${table(
      [
        ["clif", "1.2.0", "12 kB"],
        ["commander", "12.1.0", "172 kB"],
        ["inquirer", "10.2.2", "88 kB"],
      ],
      { headers: ["Package", "Version", "Size"], align: ["left", "center", "right"] },
    )}\n`,
  );

  section("table — wrapped cells (maxColumnWidth + wrap)");
  process.stdout.write(
    `${table(
      [
        ["box", "Draw a bordered box with an optional title, padding, and alignment."],
        ["table", "Render rows with headers, per-column alignment, and cell wrapping."],
      ],
      { headers: ["Component", "Description"], maxColumnWidth: 34, wrap: true },
    )}\n`,
  );

  section("table — compact & borderless");
  process.stdout.write(
    `${table(
      [
        ["GET", "/users", "200"],
        ["POST", "/users", "201"],
        ["DELETE", "/users/42", "404"],
      ],
      { headers: ["Method", "Path", "Status"], border: false, compact: true },
    )}\n`,
  );

  section("keyValue");
  process.stdout.write(
    `${keyValue({
      node: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      pid: String(process.pid),
    })}\n`,
  );
}

export function demoTree(): void {
  section("list — bulleted");
  process.stdout.write(
    `${list(["Zero dependencies", "Composable", "Tree-shakeable", "Type-safe"])}\n`,
  );

  section("list — ordered");
  process.stdout.write(
    `${list(["Define commands", "Parse arguments", "Render output"], { ordered: true })}\n`,
  );

  section("tree");
  const root: TreeNode = {
    label: bold("clif/"),
    children: [
      {
        label: "core/",
        children: [{ label: "args.ts" }, { label: "colors.ts" }, { label: "command.ts" }],
      },
      {
        label: "output/",
        children: [{ label: "components.ts" }],
      },
      {
        label: "prompts/",
        children: [{ label: "prompts.ts" }],
      },
      { label: "index.ts" },
    ],
  };
  process.stdout.write(`${tree(root)}\n`);
}

export function demoBanner(): void {
  section("banner & divider");
  process.stdout.write(
    `${banner("clif e2e harness", { color: compose(bold, hex("#f5c76a")) })}\n\n`,
  );
  process.stdout.write(`${divider({ width: 50 })}\n`);
  process.stdout.write(`${divider({ width: 50, label: "labeled divider", color: cyan })}\n`);
}

export function demoFiglet(): void {
  // Bring your own FIGfont: parse any `.flf` once, then render with it.
  const slant = parseFont(
    readFileSync(fileURLToPath(new URL("../fonts/Slant.flf", import.meta.url)), "utf8"),
  );

  section("figlet — ASCII-art (bring your own .flf)");
  process.stdout.write(`${figlet("clif", { font: slant })}\n`);

  section("figlet — gradient inside a box");
  const art = figlet("banner", {
    font: slant,
    gradient: ["#ff0080", "#f5c76a", "#7928ca"],
  });
  process.stdout.write(`${box(art, { padding: 1, borderColor: hex("#f5c76a") })}\n`);
}

export function demoLog(): void {
  section("log helpers");
  log.info("info message — routed to stdout");
  log.success("success message");
  log.warn("warn message — routed to stderr");
  log.error("error message — routed to stderr");
  log.debug("debug message — only visible with DEBUG=1");

  section("log — step counter");
  log.step(1, 3, "resolve dependencies");
  log.step(2, 3, "compile sources");
  log.step(3, 3, "write artifacts");
}

export async function demoSpinner(): Promise<void> {
  section("spinner — succeed / fail / warn / info (with step prefix)");
  const variants = [
    ["succeed", "resolving dependencies"],
    ["fail", "compiling module"],
    ["warn", "checking peer ranges"],
    ["info", "loading config"],
  ] as const;
  for (let i = 0; i < variants.length; i++) {
    const [variant, label] = variants[i]!;
    const sp = createSpinner({
      text: label,
      prefixText: dim(`[${i + 1}/${variants.length}] `),
    }).start();
    await wait(600);
    sp.update(`${label}…`);
    await wait(600);
    sp[variant](`${label} — ${variant}`);
  }
}

export async function demoProgress(): Promise<void> {
  section("progress — custom format");
  const pb = createProgress({
    total: 50,
    width: 30,
    format: ":bar :percent (:current/:total)",
  });
  while (!pb.isComplete) {
    pb.tick(1);
    await wait(30);
  }
}

export async function demoTasks(): Promise<void> {
  section("tasks — nested steps, live labels, skip & concurrency");
  await createTaskList([
    {
      title: "Install dependencies",
      task: async (t) => {
        t.update("resolving…");
        await wait(400);
        t.update("downloading…");
        await wait(400);
      },
    },
    {
      title: "Build",
      task: () => wait(300),
      children: [
        { title: "Compile TypeScript", task: () => wait(400) },
        { title: "Bundle", task: () => wait(400) },
      ],
    },
    {
      title: "Quality checks (concurrent children)",
      concurrent: true,
      children: [
        { title: "Lint", task: () => wait(500) },
        { title: "Typecheck", task: () => wait(700) },
        { title: "Unit tests", task: () => wait(600) },
      ],
    },
    {
      title: "Publish",
      task: () => wait(200),
      skip: () => "dry run",
    },
  ]).run();

  section("tasks — continueOnError collects failures");
  const result = await createTaskList(
    [
      { title: "Step that succeeds", task: () => wait(300) },
      {
        title: "Step that fails",
        task: () => {
          throw new Error("simulated failure");
        },
      },
      { title: "Step that still runs", task: () => wait(300) },
    ],
    { continueOnError: true },
  ).run();
  if (!result.ok) {
    for (const { title, error } of result.errors) {
      log.error(`${title}: ${error.message}`);
    }
  }
}

export function demoUtils(): void {
  const long =
    "clif renders beautiful terminal output with zero dependencies and a fully composable, tree-shakeable API";

  section("utils — text wrapping & truncation");
  process.stdout.write(`${bold("wordWrap(text, 44):")}\n${wordWrap(long, 44)}\n\n`);
  process.stdout.write(`${bold("truncate(text, 40):")} ${truncate(long, 40)}\n\n`);
  process.stdout.write(`${bold("indent(text, 4):")}\n${indent("first line\nsecond line", 4)}\n\n`);
  const messy = `
        function greet(name) {
          return "hi " + name;
        }
      `;
  process.stdout.write(`${bold("dedent(text):")}\n${dedent(messy)}\n`);

  section("utils — human-readable formatting");
  process.stdout.write(
    `${keyValue({
      "formatBytes(0)": formatBytes(0),
      "formatBytes(1536)": formatBytes(1536),
      "formatBytes(1073741824)": formatBytes(1_073_741_824),
      "formatDuration(450)": formatDuration(450),
      "formatDuration(5400)": formatDuration(5_400),
      "formatDuration(3661000)": formatDuration(3_661_000),
    })}\n`,
  );

  section("utils — terminal & ANSI introspection");
  const styled = bold(red("styled text"));
  process.stdout.write(
    `${keyValue({
      "isTTY()": String(isTTY()),
      "terminalWidth()": String(terminalWidth()),
      "visibleLength(styled)": String(visibleLength(styled)),
      "stripAnsi(styled)": stripAnsi(styled),
    })}\n`,
  );
}

/** Run every non-interactive demo back-to-back. */
export async function demoAll(): Promise<void> {
  process.stdout.write(
    `${banner("clif — full e2e demo", { color: compose(bold, hex("#f5c76a")) })}\n`,
  );
  demoColors();
  demoBox();
  demoTable();
  demoTree();
  demoBanner();
  demoFiglet();
  demoLog();
  await demoSpinner();
  await demoProgress();
  await demoTasks();
  demoUtils();
  process.stdout.write(`\n${green("✔ all demos completed")}\n`);
}
