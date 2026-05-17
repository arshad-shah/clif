/**
 * Interactive prompt demos. Each subcommand exercises one prompt type.
 * `kit prompt all` runs them in a group() to demonstrate composition.
 */

import { bold, cyan, dim, green, keyValue } from "clif";
import { confirm, group, multiselect, number, password, select, text } from "clif/prompts";

function show(label: string, value: unknown): void {
  process.stdout.write(`\n${green("→")} ${bold(label)}: ${cyan(JSON.stringify(value))}\n`);
}

export async function promptText(): Promise<void> {
  const value = await text({
    message: "What's your project name?",
    placeholder: "my-awesome-cli",
    validate: (v) => (v.length < 2 ? "must be at least 2 characters" : true),
  });
  show("text", value);
}

export async function promptPassword(): Promise<void> {
  const value = await password({ message: "Enter a secret (won't be echoed)" });
  show("password", `(${(value as string).length} chars hidden)`);
}

export async function promptConfirm(): Promise<void> {
  const value = await confirm({ message: "Proceed with installation?", default: true });
  show("confirm", value);
}

export async function promptSelect(): Promise<void> {
  const value = await select({
    message: "Pick a runtime",
    options: [
      { label: "Node.js", value: "node", hint: "v22+" },
      { label: "Bun", value: "bun" },
      { label: "Deno", value: "deno" },
    ],
  });
  show("select", value);
}

export async function promptMultiselect(): Promise<void> {
  const value = await multiselect({
    message: "Pick the features you want",
    options: [
      { label: "TypeScript", value: "ts" },
      { label: "ESLint", value: "eslint" },
      { label: "Prettier", value: "prettier" },
      { label: "Vitest", value: "vitest" },
    ],
    required: true,
  });
  show("multiselect", value);
}

export async function promptNumber(): Promise<void> {
  const value = await number({
    message: "How many workers?",
    default: 4,
    min: 1,
    max: 64,
  });
  show("number", value);
}

export async function promptGroup(): Promise<void> {
  process.stdout.write(dim("group() runs each prompt in sequence and returns a typed result\n"));
  const result = await group({
    name: () => text({ message: "Project name?", placeholder: "demo" }),
    runtime: () =>
      select({
        message: "Runtime?",
        options: [
          { label: "Node", value: "node" },
          { label: "Bun", value: "bun" },
        ],
      }),
    typescript: () => confirm({ message: "Use TypeScript?", default: true }),
    workers: () => number({ message: "Workers?", default: 2, min: 1, max: 16 }),
  });
  process.stdout.write(`\n${keyValue(result)}\n`);
}
