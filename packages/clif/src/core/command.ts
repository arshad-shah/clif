/**
 * clif/command — Composable command system.
 *
 * Commands can be nested as subcommands. Each command defines its own
 * args, handler, and optional subcommands. The router resolves which
 * command to run based on positional arguments.
 */

import { type ArgDef, ArgError, type ParsedArgs, parseArgs } from "./args.js";
import { bold, dim, red } from "./colors.js";

export interface CommandDef<A extends Record<string, ArgDef> = Record<string, ArgDef>> {
  name: string;
  description?: string;
  version?: string;
  args?: A;
  /**
   * Subcommands. Typed as `CommandDef<any>` so each entry can carry its own
   * arg schema without forcing a common shape on the parent.
   */
  // biome-ignore lint/suspicious/noExplicitAny: each subcommand's args generic is independent of its parent's.
  commands?: CommandDef<any>[];
  /** Called before the handler — useful for auth checks, config loading */
  setup?: (ctx: CommandContext<A>) => void | Promise<void>;
  handler?: (ctx: CommandContext<A>) => void | Promise<void>;
  /**
   * When true, an unknown subcommand at this level becomes an error
   * (with did-you-mean suggestions). Defaults to true when `commands`
   * is non-empty and no `handler` is defined.
   */
  strictSubcommands?: boolean;
}

export interface CommandContext<A extends Record<string, ArgDef> = Record<string, ArgDef>> {
  /** The resolved command definition */
  command: CommandDef<A>;
  /** Ancestor commands from root → parent (excludes the resolved command itself). */
  // biome-ignore lint/suspicious/noExplicitAny: ancestors can have any args shape.
  parents: CommandDef<any>[];
  /**
   * Parsed arguments. Typed against the resolved command's `args` schema so
   * `ctx.args.flags.<name>` carries the per-flag value type when the schema
   * uses literal types (e.g. via the `const` modifier inferred from
   * `defineCommand` / `createCLI`).
   */
  args: ParsedArgs<A>;
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
 * Identity helper for type inference on a command definition. The
 * `const` modifier preserves literal types from the call-site args
 * object, so handlers receive a fully-typed `ctx.args.flags.<name>`
 * without the caller having to write `as const`.
 */
export function defineCommand<const A extends Record<string, ArgDef>>(
  cmd: CommandDef<A>,
): CommandDef<A> {
  return cmd;
}

/**
 * Create a CLI application from a command definition.
 */
export function createCLI<const A extends Record<string, ArgDef>>(root: CommandDef<A>) {
  return {
    run: (opts?: RunOptions) => runCommand(root as InternalCommand, opts),
    command: root,
  };
}

// Internal alias used by every runtime helper below. The router doesn't care
// about the per-command args generic — it just walks the tree, parses, and
// dispatches — so we erase the parameter and avoid contravariance noise.
// biome-ignore lint/suspicious/noExplicitAny: see above.
type InternalCommand = CommandDef<any>;
// biome-ignore lint/suspicious/noExplicitAny: ditto for the context the router builds.
type InternalContext = CommandContext<any>;

/** Reserved flag-name aliases that map to help / version when not shadowed. */
const RESERVED_HELP_ALIAS = "h";
const RESERVED_VERSION_ALIAS = "v";

function userDefinesAlias(cmd: InternalCommand, alias: string): boolean {
  if (!cmd.args) return false;
  for (const def of Object.values(cmd.args as Record<string, ArgDef>)) {
    if (def.alias === alias) return true;
  }
  return false;
}

function userDefinesFlag(cmd: InternalCommand, name: string): boolean {
  return !!cmd.args && Object.prototype.hasOwnProperty.call(cmd.args, name);
}

/**
 * Augment a command's args with the implicit `--help` / `--version` flags.
 *
 * `--version` is only added when the root advertises a version, and the
 * conventional `-h` / `-v` aliases are only bound when the user hasn't
 * claimed those short flags for something else.
 */
function buildMergedArgs(command: InternalCommand, root: InternalCommand): Record<string, ArgDef> {
  const merged: Record<string, ArgDef> = { ...(command.args ?? {}) };
  if (!userDefinesFlag(command, "help")) {
    merged.help = {
      type: "boolean",
      description: "Show this help message",
      ...(userDefinesAlias(command, RESERVED_HELP_ALIAS) ? {} : { alias: RESERVED_HELP_ALIAS }),
    };
  }
  if (root.version && !userDefinesFlag(command, "version")) {
    merged.version = {
      type: "boolean",
      description: "Print the version",
      ...(userDefinesAlias(command, RESERVED_VERSION_ALIAS)
        ? {}
        : { alias: RESERVED_VERSION_ALIAS }),
    };
  }
  return merged;
}

async function runCommand(root: InternalCommand, opts?: RunOptions): Promise<void> {
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

    const args = parseArgs(buildMergedArgs(command, root), {
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

    const ctx: InternalContext = {
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
  root: InternalCommand,
  argv: string[],
): { command: InternalCommand; parents: InternalCommand[]; remaining: string[] } {
  let current = root;
  const parents: InternalCommand[] = [];
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

function printHelp(
  command: InternalCommand,
  root: InternalCommand,
  parents: InternalCommand[],
): void {
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

  const allArgs = buildMergedArgs(command, root);

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
