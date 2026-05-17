/**
 * clif/args — Lightweight argument parser.
 *
 * Supports:
 *  - Long flags: --name value, --name=value, --flag (boolean)
 *  - Short flags: -n value, -abc (stacked booleans)
 *  - Positional arguments
 *  - "--" separator (everything after goes to positional)
 *  - Type coercion (string, number, boolean)
 *  - Required / default values
 *  - Aliases
 */

export interface ArgDef {
  type: "string" | "number" | "boolean";
  alias?: string;
  description?: string;
  default?: string | number | boolean;
  required?: boolean;
  choices?: readonly (string | number)[];
}

export interface ParsedArgs {
  flags: Record<string, string | number | boolean>;
  positional: string[];
  rest: string[]; // everything after "--"
  unknown: string[];
}

export interface ParseOptions {
  args?: string[];
  stopEarly?: boolean; // treat first non-flag as start of positional
  allowUnknown?: boolean;
}

export function parseArgs(defs: Record<string, ArgDef>, opts: ParseOptions = {}): ParsedArgs {
  const argv = opts.args ?? process.argv.slice(2);
  const aliasMap = new Map<string, string>();
  const flags: Record<string, string | number | boolean> = {};
  const positional: string[] = [];
  const rest: string[] = [];
  const unknown: string[] = [];

  // Populate defaults and build alias map
  for (const [name, def] of Object.entries(defs)) {
    if (def.default !== undefined) flags[name] = def.default;
    if (def.alias) aliasMap.set(def.alias, name);
  }

  function resolveName(raw: string): string {
    return aliasMap.get(raw) ?? raw;
  }

  function coerce(name: string, value: string): string | number | boolean {
    const def = defs[name];
    if (!def) return value;
    switch (def.type) {
      case "number": {
        const n = Number(value);
        if (Number.isNaN(n)) throw new ArgError(`Expected number for --${name}, got "${value}"`);
        return n;
      }
      case "boolean":
        return value === "true" || value === "1" || value === "";
      default:
        return value;
    }
  }

  function validateChoices(name: string, value: string | number | boolean): void {
    const def = defs[name];
    if (def?.choices && !def.choices.includes(value as string | number)) {
      throw new ArgError(
        `Invalid value "${String(value)}" for --${name}. Choices: ${def.choices.join(", ")}`,
      );
    }
  }

  /**
   * `-12` and `-3.14` should be consumable as VALUES, not parsed as flags.
   * A bare `-` is not a flag either. Anything else that starts with `-` is.
   */
  function looksLikeFlag(token: string | undefined): boolean {
    if (token === undefined) return false;
    if (token.length < 2 || token[0] !== "-") return false;
    // Negative number literal — treat as a value, not a flag.
    if (/^-\d+(\.\d+)?$/.test(token)) return false;
    return true;
  }

  let pastSeparator = false;
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i]!;

    if (pastSeparator) {
      rest.push(arg);
      i++;
      continue;
    }

    if (arg === "--") {
      pastSeparator = true;
      i++;
      continue;
    }

    // Long flag: --name=value or --name value or --flag
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const rawName = resolveName(arg.slice(2, eqIdx));
        const val = arg.slice(eqIdx + 1);
        if (!(rawName in defs) && !opts.allowUnknown) {
          unknown.push(rawName);
        } else {
          flags[rawName] = coerce(rawName, val);
          validateChoices(rawName, flags[rawName]!);
        }
      } else {
        const rawName = resolveName(arg.slice(2));
        const def = defs[rawName];
        if (!def && !opts.allowUnknown) {
          unknown.push(rawName);
        } else if (!def || def.type === "boolean") {
          flags[rawName] = true;
        } else {
          const next = argv[i + 1];
          if (next === undefined || looksLikeFlag(next)) {
            throw new ArgError(`Missing value for --${rawName}`);
          }
          flags[rawName] = coerce(rawName, next);
          validateChoices(rawName, flags[rawName]!);
          i++;
        }
      }
      i++;
      continue;
    }

    // Short flag: -n value or -abc (stacked booleans)
    if (looksLikeFlag(arg)) {
      const chars = arg.slice(1);
      if (chars.length === 1) {
        const rawName = resolveName(chars);
        const def = defs[rawName];
        if (!def && !opts.allowUnknown) {
          unknown.push(rawName);
        } else if (!def || def.type === "boolean") {
          flags[rawName] = true;
        } else {
          const next = argv[i + 1];
          if (next === undefined || looksLikeFlag(next)) {
            throw new ArgError(`Missing value for -${chars}`);
          }
          flags[rawName] = coerce(rawName, next);
          validateChoices(rawName, flags[rawName]!);
          i++;
        }
      } else {
        // Stacked short flags
        for (const ch of chars) {
          const rawName = resolveName(ch);
          flags[rawName] = true;
        }
      }
      i++;
      continue;
    }

    // Positional
    if (opts.stopEarly) {
      positional.push(...argv.slice(i));
      break;
    }
    positional.push(arg);
    i++;
  }

  // Check required
  for (const [name, def] of Object.entries(defs)) {
    if (def.required && !(name in flags)) {
      throw new ArgError(`Missing required flag: --${name}`);
    }
  }

  return { flags, positional, rest, unknown };
}

export class ArgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgError";
  }
}
