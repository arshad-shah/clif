#!/usr/bin/env -S node --import tsx
/**
 * `kit` — End-to-end example CLI for the clif framework.
 *
 *   pnpm example demo all          # run every renderer demo
 *   pnpm example demo box          # one renderer only
 *   pnpm example prompt select     # one prompt
 *   pnpm example prompt all        # composed group()
 *   pnpm example args build src/index.ts -p 3000 -v -t a -t b -- --passthrough
 */

import {
  type CommandDef,
  bold,
  createCLI,
  defineCommand,
  dim,
  hex,
  keyValue,
  log,
} from "@arshad-shah/clif";
import * as d from "./demos.js";
import * as p from "./prompts.js";
import * as t from "./tui.js";

const ember = hex("#f5c76a");

function makeDemoCommand(
  name: string,
  description: string,
  run: () => void | Promise<void>,
): CommandDef {
  return { name, description, handler: run };
}

const demo: CommandDef = {
  name: "demo",
  description: "Non-interactive renderer demos",
  commands: [
    makeDemoCommand("colors", "Colors, modifiers, truecolor, compose()", d.demoColors),
    makeDemoCommand("box", "Every border style + alignment", d.demoBox),
    makeDemoCommand("table", "Table & keyValue", d.demoTable),
    makeDemoCommand("tree", "Tree & list", d.demoTree),
    makeDemoCommand("banner", "Banner & divider", d.demoBanner),
    makeDemoCommand("log", "Log helpers (info/success/warn/error/debug)", d.demoLog),
    makeDemoCommand("spinner", "Spinner with succeed/fail/warn/info", d.demoSpinner),
    makeDemoCommand("progress", "Progress bar tick-to-complete", d.demoProgress),
    makeDemoCommand("tasks", "Hierarchical task runner (skip/concurrent/errors)", d.demoTasks),
    makeDemoCommand("utils", "Text & formatting helpers (wrap/bytes/duration…)", d.demoUtils),
    makeDemoCommand("all", "Run every renderer demo back-to-back", d.demoAll),
  ],
  handler: () => {
    log.info("pick a subcommand — try `kit demo all` or `kit demo --help`");
  },
};

const prompt: CommandDef = {
  name: "prompt",
  description: "Interactive prompt demos",
  commands: [
    makeDemoCommand("text", "Single-line text prompt with validation", p.promptText),
    makeDemoCommand("password", "Masked password prompt", p.promptPassword),
    makeDemoCommand("confirm", "Yes/no confirmation", p.promptConfirm),
    makeDemoCommand("select", "Single-select list", p.promptSelect),
    makeDemoCommand("multiselect", "Multi-select list", p.promptMultiselect),
    makeDemoCommand("number", "Numeric prompt with min/max", p.promptNumber),
    makeDemoCommand("all", "group() composing every prompt type", p.promptGroup),
  ],
  handler: () => {
    log.info("pick a subcommand — try `kit prompt all` or `kit prompt --help`");
  },
};

const tui: CommandDef = {
  name: "tui",
  description: "Full-screen TUI demos (run one at a time, interactive)",
  commands: [
    makeDemoCommand("menu", "Scrollable single-select list", t.tuiMenu),
    makeDemoCommand("input", "Single-line text field with a caret", t.tuiInput),
    makeDemoCommand("viewport", "Scrollable read-only log viewer", t.tuiViewport),
  ],
  handler: () => {
    log.info("pick a subcommand — try `kit tui menu` or `kit tui --help`");
  },
};

/**
 * `args` — exercises every parseArgs feature: string/number/boolean coercion,
 * aliases, defaults, choices, repeatable (`multiple`) flags, typed positionals,
 * and the `--` separator. A `setup` hook stamps `ctx.meta` before the handler,
 * which echoes back the fully-typed parsed result.
 *
 * Authored with `defineCommand` so the handler's `ctx.args.flags.*` carry their
 * precise per-flag types (e.g. `tag` is inferred as `readonly string[]`).
 */
const args = defineCommand({
  name: "args",
  description: "Echo back parsed argv to exercise the arg parser",
  args: {
    port: { type: "number", alias: "p", default: 8080, description: "Server port" },
    host: { type: "string", default: "localhost", description: "Hostname" },
    verbose: { type: "boolean", alias: "v", default: false, description: "Verbose output" },
    env: {
      type: "string",
      alias: "e",
      choices: ["dev", "staging", "prod"] as const,
      default: "dev",
      description: "Target environment",
    },
    tag: {
      type: "string",
      alias: "t",
      multiple: true,
      description: "Repeatable tag — pass -t more than once",
    },
  },
  positionals: [
    {
      name: "command",
      choices: ["build", "test", "deploy"] as const,
      description: "Action to run",
    },
    { name: "files", variadic: true, description: "Files to operate on" },
  ],
  setup: (ctx) => {
    // setup runs before the handler — a natural home for auth/config loading.
    ctx.meta.startedAt = Date.now();
  },
  handler: (ctx) => {
    process.stdout.write(`${bold(ember("parsed args\n"))}\n`);

    // Flags may hold arrays (repeatable `multiple` flags), so render a display
    // copy that flattens those into a readable string for keyValue.
    const flagDisplay: Record<string, string> = {};
    for (const [k, v] of Object.entries(ctx.args.flags)) {
      flagDisplay[k] = Array.isArray(v) ? (v.length ? v.join(", ") : "(none)") : String(v);
    }
    process.stdout.write(`${keyValue(flagDisplay)}\n`);

    if (Object.keys(ctx.args.values).length) {
      process.stdout.write(`\n${bold("named positionals:")} ${JSON.stringify(ctx.args.values)}\n`);
    }
    if (ctx.args.rest.length) {
      process.stdout.write(`${bold("after `--`:")} ${ctx.args.rest.join(", ")}\n`);
    }
    if (ctx.args.unknown.length) {
      process.stdout.write(`${bold("unknown:")} ${ctx.args.unknown.join(", ")}\n`);
    }
    process.stdout.write(
      `\n${dim(`(setup stamped ctx.meta.startedAt = ${String(ctx.meta.startedAt)})`)}\n`,
    );
  },
});

const cli = createCLI({
  name: "kit",
  version: "0.0.0",
  description: "End-to-end demo CLI for the clif framework.",
  commands: [demo, prompt, tui, args],
  handler: () => {
    process.stdout.write(
      `${bold(ember("kit"))} — clif e2e harness\n\nTry:\n  kit demo all\n  kit demo tasks\n  kit prompt all\n  kit tui menu\n  kit args build src/index.ts -p 3000 -v -t a -t b -- --passthrough\n  kit --help\n`,
    );
  },
});

cli.run({
  onError: (err) => {
    log.error(err.message);
    process.exit(1);
  },
});
