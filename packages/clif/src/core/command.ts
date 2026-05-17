/**
 * clif/command — Composable command system.
 *
 * Commands can be nested as subcommands. Each command defines its own
 * args, handler, and optional subcommands. The router resolves which
 * command to run based on positional arguments.
 */

import { type ArgDef, type ParsedArgs, parseArgs } from "./args.js";

export interface CommandDef {
  name: string;
  description?: string;
  version?: string;
  args?: Record<string, ArgDef>;
  commands?: CommandDef[];
  /** Called before the handler — useful for auth checks, config loading */
  setup?: (ctx: CommandContext) => void | Promise<void>;
  handler?: (ctx: CommandContext) => void | Promise<void>;
}

export interface CommandContext {
  /** The resolved command definition */
  command: CommandDef;
  /** Parsed arguments */
  args: ParsedArgs;
  /** Raw argv */
  rawArgs: string[];
  /** Metadata bag for middleware-like composition */
  meta: Record<string, unknown>;
}

export interface RunOptions {
  argv?: string[];
  onError?: (error: Error) => void;
}

/**
 * Create a CLI application from a command definition.
 */
export function createCLI(root: CommandDef) {
  return {
    run: (opts?: RunOptions) => runCommand(root, opts),
    command: root,
  };
}

async function runCommand(root: CommandDef, opts?: RunOptions): Promise<void> {
  const argv = opts?.argv ?? process.argv.slice(2);

  try {
    const { command, remaining } = resolveCommand(root, argv);

    const args = parseArgs(command.args ?? {}, {
      args: remaining,
      allowUnknown: true,
    });

    // Handle --help
    if (args.flags.help) {
      printHelp(command, root);
      return;
    }

    // Handle --version
    if (args.flags.version && root.version) {
      process.stdout.write(`${root.version}\n`);
      return;
    }

    const ctx: CommandContext = {
      command,
      args,
      rawArgs: argv,
      meta: {},
    };

    if (command.setup) await command.setup(ctx);

    if (command.handler) {
      await command.handler(ctx);
    } else if (command.commands?.length) {
      // No handler but has subcommands — show help
      printHelp(command, root);
    }
  } catch (err) {
    if (opts?.onError) {
      opts.onError(err instanceof Error ? err : new Error(String(err)));
    } else {
      process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  }
}

function resolveCommand(
  root: CommandDef,
  argv: string[],
): { command: CommandDef; remaining: string[] } {
  let current = root;
  const remaining = [...argv];

  while (remaining.length > 0) {
    const next = remaining[0];
    if (!next || next.startsWith("-")) break;

    const sub = current.commands?.find((c) => c.name === next);
    if (!sub) break;

    remaining.shift();
    current = sub;
  }

  return { command: current, remaining };
}

function printHelp(command: CommandDef, root: CommandDef): void {
  const lines: string[] = [];

  if (command.description) {
    lines.push(command.description, "");
  }

  lines.push(`Usage: ${root.name} ${command !== root ? `${command.name} ` : ""}[options]`);

  if (command.commands?.length) {
    lines.push("", "Commands:");
    const maxLen = Math.max(...command.commands.map((c) => c.name.length));
    for (const sub of command.commands) {
      lines.push(`  ${sub.name.padEnd(maxLen + 2)}${sub.description ?? ""}`);
    }
  }

  if (command.args && Object.keys(command.args).length > 0) {
    lines.push("", "Options:");
    const entries = Object.entries(command.args);
    const maxLen = Math.max(
      ...entries.map(([name, def]) => {
        const alias = def.alias ? `-${def.alias}, ` : "    ";
        return alias.length + name.length + 2;
      }),
    );
    for (const [name, def] of entries) {
      const alias = def.alias ? `-${def.alias}, ` : "    ";
      const flag = `${alias}--${name}`;
      const desc = def.description ?? "";
      const dflt = def.default !== undefined ? ` (default: ${String(def.default)})` : "";
      lines.push(`  ${flag.padEnd(maxLen + 4)}${desc}${dflt}`);
    }
  }

  lines.push("");
  process.stdout.write(lines.join("\n"));
}
