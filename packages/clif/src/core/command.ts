/**
 * clif/command — Composable command system.
 *
 * Commands can be nested as subcommands. Each command defines its own
 * args, handler, and optional subcommands. The router resolves which
 * command to run based on positional arguments.
 */

import { type ArgDef, ArgError, type ParsedArgs, parseArgs } from "./args.js";
import { bold, dim, red } from "./colors.js";

export interface CommandDef {
  name: string;
  description?: string;
  version?: string;
  args?: Record<string, ArgDef>;
  commands?: CommandDef[];
  /** Called before the handler — useful for auth checks, config loading */
  setup?: (ctx: CommandContext) => void | Promise<void>;
  handler?: (ctx: CommandContext) => void | Promise<void>;
  /**
   * When true, an unknown subcommand at this level becomes an error
   * (with did-you-mean suggestions). Defaults to true when `commands`
   * is non-empty and no `handler` is defined.
   */
  strictSubcommands?: boolean;
}

export interface CommandContext {
  /** The resolved command definition */
  command: CommandDef;
  /** Ancestor commands from root → parent (excludes the resolved command itself). */
  parents: CommandDef[];
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
 * Identity helper for type inference on a command definition.
 * Equivalent to passing the literal directly, but produces better
 * IDE autocomplete and a single import-site for go-to-definition.
 */
export function defineCommand<T extends CommandDef>(cmd: T): T {
  return cmd;
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

/** Reserved flag-name aliases that map to help / version when not shadowed. */
const RESERVED_HELP_ALIAS = "h";
const RESERVED_VERSION_ALIAS = "v";

function userDefinesAlias(cmd: CommandDef, alias: string): boolean {
  if (!cmd.args) return false;
  for (const def of Object.values(cmd.args)) {
    if (def.alias === alias) return true;
  }
  return false;
}

function userDefinesFlag(cmd: CommandDef, name: string): boolean {
  return !!cmd.args && Object.prototype.hasOwnProperty.call(cmd.args, name);
}

async function runCommand(root: CommandDef, opts?: RunOptions): Promise<void> {
  const argv = opts?.argv ?? process.argv.slice(2);

  try {
    const { command, parents, remaining } = resolveCommand(root, argv);

    // Reject unknown subcommands when strict mode applies.
    const strict = command.strictSubcommands ?? (!!command.commands?.length && !command.handler);
    if (
      strict &&
      remaining.length > 0 &&
      !remaining[0]!.startsWith("-") &&
      command.commands?.length
    ) {
      const unknown = remaining[0]!;
      const known = command.commands.map((c) => c.name);
      const suggestion = nearestMatch(unknown, known);
      const hint = suggestion ? `  Did you mean "${suggestion}"?` : "";
      throw new Error(
        `Unknown command: ${unknown}\n${hint}\n  Run with --help to see available commands.`,
      );
    }

    // Merge user-defined args with implicit --help / --version so they
    // show up in help output AND can be safely aliased to -h / -v
    // unless the user has bound those aliases themselves.
    const mergedArgs: Record<string, ArgDef> = { ...(command.args ?? {}) };
    if (!userDefinesFlag(command, "help")) {
      mergedArgs.help = {
        type: "boolean",
        description: "Show this help message",
        ...(userDefinesAlias(command, RESERVED_HELP_ALIAS) ? {} : { alias: RESERVED_HELP_ALIAS }),
      };
    }
    if (root.version && !userDefinesFlag(command, "version")) {
      mergedArgs.version = {
        type: "boolean",
        description: "Print the version",
        ...(userDefinesAlias(command, RESERVED_VERSION_ALIAS)
          ? {}
          : { alias: RESERVED_VERSION_ALIAS }),
      };
    }

    const args = parseArgs(mergedArgs, {
      args: remaining,
      allowUnknown: false,
    });

    if (args.flags.help) {
      printHelp(command, root, parents);
      return;
    }

    if (args.flags.version && root.version) {
      process.stdout.write(`${root.version}\n`);
      return;
    }

    if (args.unknown.length > 0) {
      const u = args.unknown[0]!;
      throw new Error(`Unknown flag: --${u}\n  Run with --help to see available options.`);
    }

    const ctx: CommandContext = {
      command,
      parents,
      args,
      rawArgs: argv,
      meta: {},
    };

    if (command.setup) await command.setup(ctx);

    if (command.handler) {
      await command.handler(ctx);
    } else if (command.commands?.length) {
      // No handler but has subcommands — show help
      printHelp(command, root, parents);
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (opts?.onError) {
      opts.onError(error);
      process.exitCode = 1;
    } else {
      formatError(error);
      process.exitCode = 1;
    }
  }
}

function formatError(error: Error): void {
  // ArgError messages are already explicit; render with a friendly prefix.
  const prefix = error instanceof ArgError ? red(bold("✖ Invalid argument")) : red(bold("✖ Error"));
  process.stderr.write(`${prefix} ${error.message}\n`);
}

function resolveCommand(
  root: CommandDef,
  argv: string[],
): { command: CommandDef; parents: CommandDef[]; remaining: string[] } {
  let current = root;
  const parents: CommandDef[] = [];
  const remaining = [...argv];

  while (remaining.length > 0) {
    const next = remaining[0];
    if (!next || next.startsWith("-")) break;

    const sub = current.commands?.find((c) => c.name === next);
    if (!sub) break;

    remaining.shift();
    parents.push(current);
    current = sub;
  }

  return { command: current, parents, remaining };
}

function printHelp(command: CommandDef, root: CommandDef, parents: CommandDef[]): void {
  const lines: string[] = [];

  if (command.description) {
    lines.push(command.description, "");
  }

  const path = [...parents.map((p) => p.name), command.name].filter(
    (n, i, arr) => i === 0 || n !== arr[0],
  );
  lines.push(`Usage: ${path.join(" ")} [options]${command.commands?.length ? " [command]" : ""}`);

  if (command.commands?.length) {
    lines.push("", "Commands:");
    const maxLen = Math.max(...command.commands.map((c) => c.name.length));
    for (const sub of command.commands) {
      lines.push(`  ${sub.name.padEnd(maxLen + 2)}${dim(sub.description ?? "")}`);
    }
  }

  // Merge user-defined args with the implicit --help / --version so help shows them.
  const allArgs: Record<string, ArgDef> = { ...(command.args ?? {}) };
  if (!userDefinesFlag(command, "help")) {
    allArgs.help = {
      type: "boolean",
      description: "Show this help message",
      ...(userDefinesAlias(command, RESERVED_HELP_ALIAS) ? {} : { alias: RESERVED_HELP_ALIAS }),
    };
  }
  if (root.version && !userDefinesFlag(command, "version")) {
    allArgs.version = {
      type: "boolean",
      description: "Print the version",
      ...(userDefinesAlias(command, RESERVED_VERSION_ALIAS)
        ? {}
        : { alias: RESERVED_VERSION_ALIAS }),
    };
  }

  if (Object.keys(allArgs).length > 0) {
    lines.push("", "Options:");
    const entries = Object.entries(allArgs);
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
      const dflt = def.default !== undefined ? dim(` (default: ${String(def.default)})`) : "";
      lines.push(`  ${flag.padEnd(maxLen + 4)}${desc}${dflt}`);
    }
  }

  lines.push("");
  process.stdout.write(lines.join("\n"));
}

/**
 * Simple Damerau-Levenshtein distance for "did you mean" suggestions.
 * Returns the closest match within a distance threshold, or undefined.
 */
function nearestMatch(input: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    const d = editDistance(input, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  // Only suggest when the edit distance is small enough relative to length.
  const threshold = Math.max(1, Math.floor(input.length / 3) + 1);
  return bestDist <= threshold ? best : undefined;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}
