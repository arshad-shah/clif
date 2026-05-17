#!/usr/bin/env -S node --import tsx
/**
 * `kit` — End-to-end example CLI for the clif framework.
 *
 *   pnpm example demo all          # run every renderer demo
 *   pnpm example demo box          # one renderer only
 *   pnpm example prompt select     # one prompt
 *   pnpm example prompt all        # composed group()
 *   pnpm example args --port 3000 -v file.txt -- --passthrough
 */

import { type CommandDef, bold, createCLI, hex, keyValue, log } from "@arshad-shah/clif";
import * as d from "./demos.js";
import * as p from "./prompts.js";

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

/**
 * `args` — exercises every parseArgs feature: string/number/boolean coercion,
 * aliases, defaults, required, choices, positionals, and the `--` separator.
 * The handler simply echoes back the parsed result.
 */
const args: CommandDef = {
  name: "args",
  description: "Echo back parsed argv to exercise the arg parser",
  args: {
    port: { type: "number", alias: "p", default: 8080, description: "Server port" },
    host: { type: "string", alias: "h", default: "localhost", description: "Hostname" },
    verbose: { type: "boolean", alias: "v", default: false, description: "Verbose output" },
    env: {
      type: "string",
      alias: "e",
      choices: ["dev", "staging", "prod"] as const,
      default: "dev",
      description: "Target environment",
    },
    label: { type: "string", required: false, description: "Optional label" },
  },
  handler: (ctx) => {
    process.stdout.write(`${bold(ember("parsed args\n"))}\n`);
    process.stdout.write(`${keyValue(ctx.args.flags)}\n`);
    if (ctx.args.positional.length) {
      process.stdout.write(`\n${bold("positional:")} ${ctx.args.positional.join(", ")}\n`);
    }
    if (ctx.args.rest.length) {
      process.stdout.write(`${bold("after `--`:")} ${ctx.args.rest.join(", ")}\n`);
    }
    if (ctx.args.unknown.length) {
      process.stdout.write(`${bold("unknown:")} ${ctx.args.unknown.join(", ")}\n`);
    }
  },
};

const cli = createCLI({
  name: "kit",
  version: "0.0.0",
  description: "End-to-end demo CLI for the clif framework.",
  commands: [demo, prompt, args],
  handler: () => {
    process.stdout.write(
      `${bold(ember("kit"))} — clif e2e harness\n\nTry:\n  kit demo all\n  kit demo box\n  kit prompt all\n  kit args --port 3000 -v file.txt -- --passthrough\n  kit --help\n`,
    );
  },
});

cli.run({
  onError: (err) => {
    log.error(err.message);
    process.exit(1);
  },
});
