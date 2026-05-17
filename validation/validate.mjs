#!/usr/bin/env node
/**
 * Doc-claim validation harness for @arshad-shah/clif v1.1.1.
 *
 * Loads the built dist directly (the same artefact the npm consumer gets)
 * and asserts every public API and documented behavior. Each check is a
 * single test that PASS/FAIL. Final report prints a PASS table and a
 * FAIL table with the doc location and the observed value.
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const clifRoot = resolve(here, "..", "packages", "clif");
const clifDist = resolve(clifRoot, "dist", "index.mjs");
const promptsDist = resolve(clifRoot, "dist", "prompts.mjs");

const clif = await import(clifDist);
const prompts = await import(promptsDist);

// ── Harness ─────────────────────────────────────────────────────────────────

const results = [];

function pushResult(name, docSource, value) {
  if (value && typeof value === "object" && "ok" in value) {
    results.push({ status: value.ok ? "PASS" : "FAIL", name, docSource, detail: value.detail });
  } else {
    results.push({ status: "PASS", name, docSource, detail: "" });
  }
}

async function check(name, fn, docSource = "") {
  try {
    const value = await fn();
    pushResult(name, docSource, value);
  } catch (err) {
    results.push({ status: "FAIL", name, docSource, detail: `${err.name}: ${err.message}` });
  }
}

function expectEqual(actual, expected, label = "") {
  if (actual !== expected) {
    const a = typeof actual === "string" ? JSON.stringify(actual) : String(actual);
    const e = typeof expected === "string" ? JSON.stringify(expected) : String(expected);
    return { ok: false, detail: `${label} expected ${e} got ${a}` };
  }
  return { ok: true, detail: "" };
}
function expectDeep(actual, expected, label = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) return { ok: false, detail: `${label} expected ${e} got ${a}` };
  return { ok: true, detail: "" };
}
function expectMatch(actual, re, label = "") {
  if (typeof actual !== "string" || !re.test(actual)) {
    return { ok: false, detail: `${label} expected match ${re} got ${JSON.stringify(actual)}` };
  }
  return { ok: true, detail: "" };
}
function expectThrow(fn, errType, label = "") {
  try { fn(); }
  catch (err) {
    if (errType && !(err instanceof errType)) {
      return { ok: false, detail: `${label} expected ${errType.name} got ${err.constructor.name}: ${err.message}` };
    }
    return { ok: true, detail: "" };
  }
  return { ok: false, detail: `${label} expected throw ${errType?.name ?? "Error"} but did not` };
}

/** Run an async block that may write to process.stdout / stderr; returns
 *  what was written. Restores the original streams on completion. */
async function captureStd(fn) {
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  let out = "", err = "";
  process.stdout.write = (s) => { out += String(s); return true; };
  process.stderr.write = (s) => { err += String(s); return true; };
  try { await fn(); } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  return { out, err };
}

// ── Exports (api/reference.md) ──────────────────────────────────────────────

const coreExports = [
  "bold","dim","italic","underline","inverse","hidden","strikethrough","reset",
  "black","red","green","yellow","blue","magenta","cyan","white","gray","grey",
  "redBright","greenBright","yellowBright","blueBright","magentaBright","cyanBright","whiteBright",
  "bgBlack","bgRed","bgGreen","bgYellow","bgBlue","bgMagenta","bgCyan","bgWhite","bgGray",
  "bgRedBright","bgGreenBright","bgYellowBright","bgBlueBright","bgMagentaBright","bgCyanBright","bgWhiteBright",
  "rgb256","bgRgb256","rgb","bgRgb","hex","bgHex",
  "compose","stripAnsi","visibleLength","colorLevel","isColorSupported",
  "parseArgs","ArgError",
  "createCLI","defineCommand",
  "box","table","keyValue","list","tree","divider","banner","createSpinner","createProgress","log",
  "isTTY","terminalWidth","truncate","wordWrap","indent","dedent","formatBytes","formatDuration",
];
for (const name of coreExports) {
  await check(`export @arshad-shah/clif → ${name}`,
    () => expectEqual(typeof clif[name] !== "undefined", true, name),
    "api/reference.md");
}

const promptExports = ["text","password","confirm","select","multiselect","number","group","PromptError"];
for (const name of promptExports) {
  await check(`export @arshad-shah/clif/prompts → ${name}`,
    () => expectEqual(typeof prompts[name] !== "undefined", true, name),
    "api/reference.md");
}

// ── Colors (guides/colors.md) ───────────────────────────────────────────────

clif.colorLevel(3);

await check("red() wraps text in ANSI",
  () => expectEqual(clif.red("err"), "\x1b[31merr\x1b[39m"), "guides/colors.md");
await check("bold() wraps text in ANSI",
  () => expectEqual(clif.bold("x"), "\x1b[1mx\x1b[22m"), "guides/colors.md");
await check("gray alias matches grey",
  () => expectEqual(clif.gray("x"), clif.grey("x")), "guides/colors.md");
await check("compose() equals nested calls",
  () => expectEqual(clif.compose(clif.bold, clif.underline)("x"), clif.bold(clif.underline("x"))),
  "guides/colors.md");
await check("rgb() produces 38;2;r;g;b",
  () => expectMatch(clif.rgb(255, 0, 0)("x"), /\x1b\[38;2;255;0;0m/), "guides/colors.md");
await check("rgb256() produces 38;5;n",
  () => expectMatch(clif.rgb256(208)("x"), /\x1b\[38;5;208m/), "guides/colors.md");
await check("hex() accepts #ff0000",
  () => expectMatch(clif.hex("#ff0000")("x"), /\x1b\[38;2;255;0;0m/), "guides/colors.md");
await check("hex() accepts ff0000 (no #)",
  () => expectMatch(clif.hex("ff0000")("x"), /\x1b\[38;2;255;0;0m/), "guides/colors.md");
await check("hex() throws on malformed input",
  () => expectThrow(() => clif.hex("#zzzzzz"), RangeError), "api/reference.md");
await check("rgb() throws on out-of-range",
  () => expectThrow(() => clif.rgb(256, 0, 0), RangeError), "api/reference.md");
await check("rgb256() throws on out-of-range (CHANGELOG 1.1.1)",
  () => expectThrow(() => clif.rgb256(256), RangeError), "CHANGELOG 1.1.1");
await check("stripAnsi() removes ANSI",
  () => expectEqual(clif.stripAnsi(clif.red("hello")), "hello"), "guides/colors.md");
await check("visibleLength() ignores ANSI",
  () => expectEqual(clif.visibleLength(clif.red("hello")), 5), "guides/colors.md");
await check("colorLevel() get/set", () => {
  clif.colorLevel(0); const l0 = clif.colorLevel();
  clif.colorLevel(3); const l3 = clif.colorLevel();
  return expectEqual(l0 === 0 && l3 === 3, true);
}, "guides/colors.md");
await check("level=0 strips ANSI emission", () => {
  clif.colorLevel(0); const r = clif.red("x"); clif.colorLevel(3);
  return expectEqual(r, "x");
}, "guides/colors.md");

// ── Args (guides/arguments.md) ──────────────────────────────────────────────

const { parseArgs, ArgError } = clif;

await check("parseArgs basic flags + positional", () => {
  const r = parseArgs(
    { name: { type: "string", alias: "n" }, port: { type: "number", alias: "p", default: 3000 }, verbose: { type: "boolean", alias: "v" } },
    { args: ["--name", "alice", "-p", "8080", "-v", "file"] });
  const ok = r.flags.name === "alice" && r.flags.port === 8080 && r.flags.verbose === true
    && r.positional.length === 1 && r.positional[0] === "file"
    && r.rest.length === 0 && r.unknown.length === 0;
  return { ok, detail: ok ? "" : `got ${JSON.stringify({ flags: r.flags, positional: r.positional, rest: r.rest, unknown: r.unknown })}` };
}, "guides/arguments.md");

await check("parseArgs --name=value form",
  () => expectEqual(parseArgs({ name: { type: "string" } }, { args: ["--name=alice"] }).flags.name, "alice"),
  "guides/arguments.md");

await check("parseArgs stacked booleans -abc", () => {
  const r = parseArgs(
    { a: { type: "boolean" }, b: { type: "boolean" }, c: { type: "boolean" } },
    { args: ["-abc"] });
  return expectDeep(r.flags, { a: true, b: true, c: true });
}, "guides/arguments.md");

await check("parseArgs negation --no-flag",
  () => expectEqual(parseArgs({ v: { type: "boolean", default: true } }, { args: ["--no-v"] }).flags.v, false),
  "guides/arguments.md");

await check("parseArgs negative integer is a value",
  () => expectEqual(parseArgs({ o: { type: "number" } }, { args: ["--o", "-5"] }).flags.o, -5),
  "guides/arguments.md");

await check("parseArgs negative scientific is a value (CHANGELOG 1.1.1)",
  () => expectEqual(parseArgs({ s: { type: "number" } }, { args: ["--s", "-1.5e3"] }).flags.s, -1500),
  "CHANGELOG 1.1.1");

await check("parseArgs `--` separator collects into rest",
  () => expectDeep(parseArgs({ v: { type: "boolean" } }, { args: ["-v", "--", "--p"] }).rest, ["--p"]),
  "guides/arguments.md");

await check("parseArgs unknown flag collects into unknown[]",
  () => expectDeep(parseArgs({}, { args: ["--x"] }).unknown, ["x"]),
  "guides/arguments.md");

await check("parseArgs allowUnknown places unknowns into flags",
  () => expectEqual(parseArgs({}, { args: ["--u=v"], allowUnknown: true }).flags.u, "v"),
  "guides/arguments.md");

await check("parseArgs choices validates input",
  () => expectThrow(() => parseArgs({ e: { type: "string", choices: ["a","b"] } }, { args: ["--e","x"] }), ArgError),
  "guides/arguments.md");

await check("parseArgs choices validates default (CHANGELOG 1.1.1)",
  () => expectThrow(() => parseArgs({ e: { type: "string", choices: ["a","b"], default: "x" } }), ArgError),
  "CHANGELOG 1.1.1");

await check("parseArgs required throws when missing",
  () => expectThrow(() => parseArgs({ t: { type: "string", required: true } }, { args: [] }), ArgError),
  "guides/arguments.md");

await check("parseArgs required NOT satisfied by default",
  () => expectThrow(() => parseArgs({ t: { type: "string", required: true, default: "x" } }, { args: [] }), ArgError),
  "guides/arguments.md");

await check("parseArgs multiple flags accumulate", () => {
  const r = parseArgs({ i: { type: "string", multiple: true } }, { args: ["--i","a","--i","b","--i=c"] });
  return expectDeep(r.flags.i, ["a","b","c"]);
}, "guides/arguments.md");

await check("parseArgs multiple defaults to []",
  () => expectDeep(parseArgs({ i: { type: "string", multiple: true } }, { args: [] }).flags.i, []),
  "guides/arguments.md");

await check("parseArgs number coerce throws on non-number",
  () => expectThrow(() => parseArgs({ p: { type: "number" } }, { args: ["--p","abc"] }), ArgError),
  "guides/arguments.md");

await check("parseArgs --port= rejected (CHANGELOG 1.1.1)",
  () => expectThrow(() => parseArgs({ p: { type: "number" } }, { args: ["--p="] }), ArgError),
  "CHANGELOG 1.1.1");

await check("parseArgs --name= accepted for string",
  () => expectEqual(parseArgs({ n: { type: "string" } }, { args: ["--n="] }).flags.n, ""),
  "guides/arguments.md");

await check("parseArgs --no-flag=value rejected for boolean (CHANGELOG 1.1.1)",
  () => expectThrow(() => parseArgs({ v: { type: "boolean" } }, { args: ["--no-v=true"] }), ArgError),
  "CHANGELOG 1.1.1");

await check("parseArgs stopEarly halts on first positional", () => {
  const r = parseArgs({ v: { type: "boolean" } }, { args: ["cmd","-v","file"], stopEarly: true });
  return expectDeep(r.positional, ["cmd","-v","file"]);
}, "guides/arguments.md");

await check("ArgError exposes .flag", () => {
  try { parseArgs({ p: { type: "number" } }, { args: ["--p","abc"] }); }
  catch (err) { return expectEqual(err instanceof ArgError && err.flag, "p"); }
  return { ok: false, detail: "did not throw" };
}, "guides/arguments.md");

await check("parseArgs prototype-pollution defense", () => {
  const r = parseArgs({}, { args: ["--__proto__=x","--constructor=y"] });
  return expectEqual(r.unknown.includes("__proto__") && r.unknown.includes("constructor"), true);
}, "core/args.ts");

// ── Box (components/box.md) ─────────────────────────────────────────────────

clif.colorLevel(0);

await check("box default border 'round'",
  () => expectMatch(clif.box("hi"), /^╭/), "components/box.md");
await check("box border 'single'",
  () => expectMatch(clif.box("x", { border: "single" }), /^┌/), "components/box.md");
await check("box border 'double'",
  () => expectMatch(clif.box("x", { border: "double" }), /^╔/), "components/box.md");
await check("box border 'bold'",
  () => expectMatch(clif.box("x", { border: "bold" }), /^┏/), "components/box.md");
await check("box border 'none'",
  () => expectMatch(clif.box("x", { border: "none" }), /^ /), "components/box.md");
await check("box title rendered in top border",
  () => expectMatch(clif.box("hi", { title: "Notice" }), /Notice/), "components/box.md");
await check("box top/bottom border same width when title wider than content (CHANGELOG 1.1.1)", () => {
  const r = clif.box("hi", { title: "very long title that exceeds the content width" });
  const lines = r.split("\n");
  return expectEqual(clif.visibleLength(lines[0]), clif.visibleLength(lines[lines.length - 1]));
}, "CHANGELOG 1.1.1");
await check("box auto-expands inner width to fit content + padding", () => {
  const r = clif.box("hello", { width: 1 });
  const lines = r.split("\n");
  const w = clif.visibleLength(lines[0]);
  return expectEqual(w >= "hello".length + 4, true);
}, "components/box.md");

// ── Table (components/table.md) ────────────────────────────────────────────

await check("table headers separator emitted by default", () => {
  const r = clif.table([["a","b"]], { headers: ["X","Y"] });
  return expectMatch(r, /[├┤]/);
}, "components/table.md");
await check("table border:false omits borders",
  () => expectEqual(clif.table([["a","b"]], { border: false }).includes("│"), false),
  "components/table.md");
await check("table maxColumnWidth truncates",
  () => expectMatch(clif.table([["very-long-cell-value","x"]], { maxColumnWidth: 8 }), /…/),
  "components/table.md");
await check("table compact suppresses header separator (CHANGELOG 1.1.1)", () => {
  const compact = clif.table([["x"]], { headers: ["h"], compact: true });
  const normal = clif.table([["x"]], { headers: ["h"], compact: false });
  return expectEqual(compact.split("\n").length < normal.split("\n").length, true);
}, "CHANGELOG 1.1.1");

// ── keyValue / list / tree / divider / banner ──────────────────────────────

await check("keyValue aligns keys",
  () => expectMatch(clif.keyValue({ short: "1", longer: "2" }), /short\s+1\nlonger\s+2/),
  "components/log-divider.md");
await check("list default unordered uses ●",
  () => expectMatch(clif.list(["a","b"]), /●/), "components/list-tree.md");
await check("list ordered uses N.",
  () => expectMatch(clif.list(["a","b"], { ordered: true }), /1\./), "components/list-tree.md");
await check("tree renders root only",
  () => expectEqual(clif.tree({ label: "root" }), "root"), "components/list-tree.md");
await check("tree two-level depth indents correctly",
  () => expectEqual(clif.tree({ label: "A", children: [{ label: "B" }] }), "A\n└── B"),
  "components/list-tree.md");
await check("tree three-level depth indents per documented example", () => {
  const r = clif.tree({ label: "A", children: [{ label: "B", children: [{ label: "C" }] }] });
  // docs/components/list-tree.md shows grandchildren under "    └── C" (4 leading spaces)
  return expectEqual(r, "A\n└── B\n    └── C");
}, "components/list-tree.md DOC EXAMPLE");
await check("tree mixed siblings with deep nesting (docs example)", () => {
  // docs/components/list-tree.md shows:
  // src
  // ├── core
  // │   ├── colors.ts
  // │   └── args.ts
  // ├── output
  // │   └── components.ts
  // └── index.ts
  const r = clif.tree({
    label: "src",
    children: [
      { label: "core", children: [{ label: "colors.ts" }, { label: "args.ts" }] },
      { label: "output", children: [{ label: "components.ts" }] },
      { label: "index.ts" },
    ],
  });
  const expected =
    "src\n" +
    "├── core\n" +
    "│   ├── colors.ts\n" +
    "│   └── args.ts\n" +
    "├── output\n" +
    "│   └── components.ts\n" +
    "└── index.ts";
  return expectEqual(r, expected);
}, "components/list-tree.md DOC EXAMPLE");
await check("divider() default width 60",
  () => expectEqual(clif.visibleLength(clif.divider()), 60), "components/log-divider.md");
await check("divider({label,width}) does not crash on overflow (CHANGELOG 1.1.1)",
  () => ({ ok: typeof clif.divider({ label: "very long label", width: 5 }) === "string", detail: "" }),
  "CHANGELOG 1.1.1");
await check("banner() wraps text in three border lines", () => {
  const r = clif.banner("Deploy v2.0");
  return expectEqual(r.split("\n").length, 3);
}, "components/log-divider.md");

// ── Spinner ────────────────────────────────────────────────────────────────

class FakeStream {
  constructor(tty = true) { this.chunks = []; this.isTTY = tty; }
  write(s) { this.chunks.push(String(s)); return true; }
  toString() { return this.chunks.join(""); }
}

await check("createSpinner exposes documented methods", () => {
  const sp = clif.createSpinner({ stream: new FakeStream() });
  const want = ["start","stop","succeed","fail","warn","info","update"];
  const missing = want.filter(k => typeof sp[k] !== "function");
  return expectEqual(missing.length, 0, `missing: ${missing.join(",")}`);
}, "components/spinner-progress.md");

await check("createSpinner non-TTY emits a single line on start + finalText on stop", () => {
  const stream = new FakeStream(false);
  const sp = clif.createSpinner({ text: "loading", stream });
  sp.start();
  sp.succeed("done");
  return expectMatch(stream.toString(), /done/);
}, "components/spinner-progress.md");

await check("createSpinner.start() is idempotent", () => {
  const stream = new FakeStream(false);
  const sp = clif.createSpinner({ text: "x", stream });
  sp.start(); sp.start();
  sp.stop();
  return { ok: true, detail: "" };
}, "core/components.ts");

// ── Progress ───────────────────────────────────────────────────────────────

await check("createProgress total <= 0 throws RangeError",
  () => expectThrow(() => clif.createProgress({ total: 0 }), RangeError),
  "components/spinner-progress.md");
await check("createProgress tick + isComplete", () => {
  const stream = new FakeStream(true);
  const pb = clif.createProgress({ total: 4, stream });
  pb.tick(); pb.tick();
  return expectDeep({ v: pb.value, c: pb.isComplete }, { v: 2, c: false });
}, "components/spinner-progress.md");
await check("createProgress reaches isComplete at total", () => {
  const stream = new FakeStream(true);
  const pb = clif.createProgress({ total: 2, stream });
  pb.tick(2);
  return expectEqual(pb.isComplete, true);
}, "components/spinner-progress.md");
await check("createProgress all 4 placeholders are replaced everywhere (CHANGELOG 1.1.1)", () => {
  const stream = new FakeStream(true);
  const pb = clif.createProgress({ total: 10, stream, format: ":percent :percent :current :current :total :total" });
  pb.tick(5);
  const out = stream.toString();
  return expectEqual((out.match(/50%/g) ?? []).length, 2);
}, "CHANGELOG 1.1.1");

// ── log helpers ────────────────────────────────────────────────────────────

await check("log.* methods all present", () => {
  const want = ["info","success","warn","error","debug","step"];
  const missing = want.filter(k => typeof clif.log[k] !== "function");
  return expectEqual(missing.length, 0, `missing: ${missing.join(",")}`);
}, "components/log-divider.md");

await check("log.info writes to stdout / log.error writes to stderr", async () => {
  const { out, err } = await captureStd(() => { clif.log.info("hi"); clif.log.error("bye"); });
  return expectEqual(out.includes("hi") && err.includes("bye"), true);
}, "components/log-divider.md");

await check("log.debug only emits when process.env.DEBUG is truthy", async () => {
  const restore = process.env.DEBUG;
  delete process.env.DEBUG;
  const off = await captureStd(() => { clif.log.debug("nope"); });
  process.env.DEBUG = "1";
  const on = await captureStd(() => { clif.log.debug("yep"); });
  if (restore === undefined) delete process.env.DEBUG; else process.env.DEBUG = restore;
  return expectEqual(off.err === "" && on.err.includes("yep"), true);
}, "components/log-divider.md");

// ── Utils ───────────────────────────────────────────────────────────────────

await check("truncate is ANSI-aware (preserves color span, counts visible only)", () => {
  clif.colorLevel(3);
  const r = clif.truncate(clif.red("hello world"), 5);
  clif.colorLevel(0);
  return expectEqual(clif.visibleLength(r), 5);
}, "api/reference.md");
await check("wordWrap breaks at width",
  () => expectEqual(clif.wordWrap("hello world how are you", 10), "hello\nworld how\nare you"),
  "api/reference.md");
await check("indent prepends spaces",
  () => expectEqual(clif.indent("a\nb", 2), "  a\n  b"),
  "api/reference.md");
await check("dedent strips common leading whitespace",
  () => expectEqual(clif.dedent("  a\n  b"), "a\nb"),
  "api/reference.md");
await check("formatBytes B/KB/MB", () => {
  return expectDeep(
    { a: clif.formatBytes(512), b: clif.formatBytes(1024), c: clif.formatBytes(1048576) },
    { a: "512 B", b: "1.0 KB", c: "1.0 MB" });
}, "api/reference.md");
await check("formatBytes handles negatives",
  () => expectEqual(clif.formatBytes(-1024), "-1.0 KB"), "core/helpers.ts");
await check("formatBytes handles non-finite",
  () => expectEqual(clif.formatBytes(NaN), "NaN"), "core/helpers.ts");
await check("formatDuration ms/s/m+s", () => {
  return expectDeep(
    { a: clif.formatDuration(500), b: clif.formatDuration(1500), c: clif.formatDuration(125000) },
    { a: "500ms", b: "1.5s", c: "2m 5s" });
}, "api/reference.md");
await check("formatDuration handles non-finite (CHANGELOG 1.1.1)",
  () => expectEqual(clif.formatDuration(NaN), "NaN"), "CHANGELOG 1.1.1");

// ── createCLI ──────────────────────────────────────────────────────────────

await check("createCLI returns { run, command }", () => {
  const cli = clif.createCLI({ name: "x" });
  return expectEqual(typeof cli.run === "function" && typeof cli.command === "object", true);
}, "guides/commands.md");

await check("createCLI handler runs", async () => {
  let called = false;
  await clif.createCLI({ name: "x", handler: () => { called = true; } }).run({ argv: [] });
  return expectEqual(called, true);
}, "guides/commands.md");

await check("createCLI parses subcommand", async () => {
  let called = false;
  await clif.createCLI({
    name: "git", commands: [{ name: "add", handler: () => { called = true; } }],
  }).run({ argv: ["add"] });
  return expectEqual(called, true);
}, "guides/commands.md");

await check("createCLI setup runs before handler", async () => {
  const order = [];
  await clif.createCLI({
    name: "x",
    setup: () => { order.push("setup"); },
    handler: () => { order.push("handler"); },
  }).run({ argv: [] });
  return expectDeep(order, ["setup", "handler"]);
}, "guides/commands.md");

await check("createCLI strict subcommand suggests did-you-mean", async () => {
  let errSeen = null;
  await clif.createCLI({
    name: "git",
    commands: [{ name: "build", handler: () => {} }],
  }).run({ argv: ["buidl"], onError: (e) => { errSeen = e; } });
  return expectMatch(errSeen?.message ?? "", /Did you mean "build"/);
}, "guides/commands.md");

await check("createCLI --version prints version", async () => {
  const { out } = await captureStd(async () => {
    await clif.createCLI({ name: "x", version: "9.9.9" }).run({ argv: ["--version"] });
  });
  return expectEqual(out.trim(), "9.9.9");
}, "guides/commands.md");

await check("createCLI --help prints Usage", async () => {
  const { out } = await captureStd(async () => {
    await clif.createCLI({ name: "x", description: "Y" }).run({ argv: ["--help"] });
  });
  return expectMatch(out, /Usage:/);
}, "guides/commands.md");

await check("createCLI onError captures errors", async () => {
  let captured = null;
  await clif.createCLI({
    name: "x",
    handler: () => { throw new Error("boom"); },
  }).run({ argv: [], onError: (e) => { captured = e; } });
  return expectEqual(captured?.message, "boom");
}, "guides/commands.md");

await check("createCLI unknown flag emits error", async () => {
  let captured = null;
  await clif.createCLI({ name: "x", handler: () => {} })
    .run({ argv: ["--nonsense"], onError: (e) => { captured = e; } });
  return expectMatch(captured?.message ?? "", /Unknown flag/);
}, "guides/commands.md");

await check("createCLI nested subcommand resolves", async () => {
  let called = false;
  await clif.createCLI({
    name: "tool",
    commands: [{
      name: "config",
      commands: [{ name: "set", handler: () => { called = true; } }],
    }],
  }).run({ argv: ["config", "set"] });
  return expectEqual(called, true);
}, "guides/commands.md");

await check("createCLI ArgError uses '✖ Invalid argument' prefix on stderr", async () => {
  const { err } = await captureStd(async () => {
    await clif.createCLI({
      name: "x",
      args: { e: { type: "string", choices: ["a","b"] } },
      handler: () => {},
    }).run({ argv: ["--e", "x"] });
  });
  return expectMatch(err, /Invalid argument/);
}, "guides/commands.md");

await check("defineCommand is the identity function", () => {
  const def = { name: "x" };
  return expectEqual(clif.defineCommand(def), def);
}, "guides/commands.md");

// ── PromptError ────────────────────────────────────────────────────────────

await check("PromptError exposes .code", () => {
  const err = new prompts.PromptError("cancelled", "x");
  return expectEqual(err.code, "cancelled");
}, "api/reference.md");

await check("password() rejects under non-TTY (PromptError code='not-a-tty')", async () => {
  try {
    await prompts.password({ message: "x" });
    return { ok: false, detail: "did not reject" };
  } catch (err) {
    return expectEqual(err.code, "not-a-tty");
  }
}, "components/text-password.md");

await check("select() rejects under non-TTY", async () => {
  try {
    await prompts.select({ message: "x", options: [{ label: "a", value: "a" }] });
    return { ok: false, detail: "did not reject" };
  } catch (err) { return expectEqual(err.code, "not-a-tty"); }
}, "components/select-multiselect.md");

await check("multiselect() rejects under non-TTY", async () => {
  try {
    await prompts.multiselect({ message: "x", options: [{ label: "a", value: "a" }] });
    return { ok: false, detail: "did not reject" };
  } catch (err) { return expectEqual(err.code, "not-a-tty"); }
}, "components/select-multiselect.md");

await check("select empty options throws", async () => {
  try {
    await prompts.select({ message: "x", options: [] });
    return { ok: false, detail: "did not throw" };
  } catch { return { ok: true, detail: "" }; }
}, "components/select-multiselect.md");

// ── README claims: zero-dep, < 15 KB gzipped, types included ───────────────

const distDir = resolve(clifRoot, "dist");
const formats = { mjs: 0, cjs: 0 };
for (const file of readdirSync(distDir)) {
  if (!statSync(resolve(distDir, file)).isFile()) continue;
  if (/\.(map|d\.[mc]?ts)$/.test(file)) continue;
  const gz = gzipSync(readFileSync(resolve(distDir, file))).length;
  if (file.endsWith(".mjs")) formats.mjs += gz;
  if (file.endsWith(".cjs")) formats.cjs += gz;
}
await check(`bundle ESM (${(formats.mjs/1024).toFixed(2)} KB gz) < 15 KB`,
  () => expectEqual(formats.mjs < 15 * 1024, true), "README.md");
await check(`bundle CJS (${(formats.cjs/1024).toFixed(2)} KB gz) < 15 KB`,
  () => expectEqual(formats.cjs < 15 * 1024, true), "README.md");

const pkg = JSON.parse(readFileSync(resolve(clifRoot, "package.json"), "utf8"));
await check("zero runtime dependencies",
  () => expectEqual(pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0, true),
  "README.md");

await check("subpath export 'clif/prompts' resolves",
  () => expectEqual(typeof prompts.text, "function"), "README.md");

// ── Final report ───────────────────────────────────────────────────────────

const passed = results.filter(r => r.status === "PASS");
const failed = results.filter(r => r.status === "FAIL");

console.log("");
console.log(`╭${"─".repeat(78)}╮`);
const head = ` clif v${pkg.version}  doc-claim validation`;
console.log(`│${head}${" ".repeat(Math.max(0, 78 - head.length))}│`);
console.log(`╰${"─".repeat(78)}╯`);
console.log("");
console.log(`Ran ${results.length} checks: ${passed.length} passed, ${failed.length} failed`);
console.log("");

if (failed.length > 0) {
  console.log("FAILURES");
  console.log("─".repeat(80));
  for (const r of failed) {
    console.log(`✖ ${r.name}`);
    if (r.docSource) console.log(`     doc: ${r.docSource}`);
    if (r.detail) console.log(`     why: ${r.detail}`);
  }
  console.log("");
}

console.log("PASSED");
console.log("─".repeat(80));
for (const r of passed) console.log(`✓ ${r.name}`);
console.log("");

process.exit(failed.length === 0 ? 0 : 1);
