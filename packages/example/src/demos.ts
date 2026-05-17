/**
 * Non-interactive renderer demos.
 * Each function returns void and writes directly to stdout/stderr so the
 * caller can sequence them or pick one.
 */

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
  cyan,
  cyanBright,
  dim,
  divider,
  green,
  hex,
  inverse,
  italic,
  keyValue,
  list,
  log,
  magenta,
  red,
  rgb,
  strikethrough,
  table,
  tree,
  underline,
  yellow,
} from "@arshad-shah/clif";

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
  section("list");
  process.stdout.write(
    `${list(["Zero dependencies", "Composable", "Tree-shakeable", "Type-safe"])}\n`,
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

export function demoLog(): void {
  section("log helpers");
  log.info("info message — routed to stdout");
  log.success("success message");
  log.warn("warn message — routed to stderr");
  log.error("error message — routed to stderr");
  log.debug("debug message — only visible with DEBUG=1");
}

export async function demoSpinner(): Promise<void> {
  section("spinner — succeed / fail / warn / info");
  for (const [variant, label] of [
    ["succeed", "resolving dependencies"],
    ["fail", "compiling module"],
    ["warn", "checking peer ranges"],
    ["info", "loading config"],
  ] as const) {
    const sp = createSpinner({ text: label }).start();
    await new Promise((r) => setTimeout(r, 600));
    sp.update(`${label}…`);
    await new Promise((r) => setTimeout(r, 600));
    sp[variant](`${label} — ${variant}`);
  }
}

export async function demoProgress(): Promise<void> {
  section("progress");
  const pb = createProgress({ total: 50, width: 30 });
  while (!pb.isComplete) {
    pb.tick(1);
    await new Promise((r) => setTimeout(r, 30));
  }
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
  demoLog();
  await demoSpinner();
  await demoProgress();
  process.stdout.write(`\n${green("✔ all demos completed")}\n`);
}
