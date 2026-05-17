/**
 * clif/args — Lightweight argument parser.
 *
 * Supports:
 *  - Long flags: --name value, --name=value, --flag (boolean)
 *  - Short flags: -n value, -abc (stacked booleans)
 *  - Negation: --no-flag toggles boolean to false
 *  - Repeat flags: { multiple: true } accumulates values
 *  - Positional arguments
 *  - "--" separator (everything after goes to positional)
 *  - Type coercion (string, number, boolean)
 *  - Required / default values
 *  - Aliases
 *  - Choices validation
 */

export interface ArgDef {
  type: "string" | "number" | "boolean";
  alias?: string;
  description?: string;
  default?: string | number | boolean | readonly (string | number)[];
  required?: boolean;
  choices?: readonly (string | number)[];
  /** When true, the flag can be repeated and values accumulate into an array. */
  multiple?: boolean;
}

type FlagValue = string | number | boolean | readonly (string | number)[];

/**
 * Map a single ArgDef → its parsed value type.
 *  - `multiple: true` produces an array of the base type.
 *  - Otherwise the base type is `string` / `number` / `boolean`.
 */
export type FlagValueOf<D extends ArgDef> = D["multiple"] extends true
  ? D["type"] extends "number"
    ? readonly number[]
    : readonly string[]
  : D["type"] extends "number"
    ? number
    : D["type"] extends "boolean"
      ? boolean
      : string;

/** Map an ArgDef record → strongly-typed flags record. */
export type FlagsFromDefs<T extends Record<string, ArgDef>> = {
  [K in keyof T]: FlagValueOf<T[K]>;
};

export interface ParsedArgs<T extends Record<string, ArgDef> = Record<string, ArgDef>> {
  flags: FlagsFromDefs<T> & Record<string, FlagValue>;
  positional: string[];
  rest: string[]; // everything after "--"
  unknown: string[];
}

export interface ParseOptions {
  args?: string[];
  /** Treat the first non-flag token as the start of positional args. */
  stopEarly?: boolean;
  /** Place unknown flags into `flags` (with value `true` for booleans, raw string otherwise) instead of `unknown`. */
  allowUnknown?: boolean;
}

export class ArgError extends Error {
  /** The canonical flag name this error relates to, if any. */
  readonly flag: string | undefined;

  constructor(message: string, flag?: string) {
    super(message);
    this.name = "ArgError";
    this.flag = flag;
  }
}

const HAS_OWN = Object.prototype.hasOwnProperty;

function isPrototypePollutionKey(name: string): boolean {
  return name === "__proto__" || name === "constructor" || name === "prototype";
}

export function parseArgs<T extends Record<string, ArgDef>>(
  defs: T,
  opts?: ParseOptions,
): ParsedArgs<T>;
export function parseArgs(defs: Record<string, ArgDef>, opts?: ParseOptions): ParsedArgs;
export function parseArgs(defs: Record<string, ArgDef>, opts: ParseOptions = {}): ParsedArgs {
  const argv = opts.args ?? process.argv.slice(2);
  const aliasMap = new Map<string, string>();
  // Use a null-prototype object to harden against __proto__ / constructor pollution
  // from untrusted argv, then surface as a plain Record<> in the return.
  const flags: Record<string, FlagValue> = Object.create(null);
  const userProvided = new Set<string>();
  const positional: string[] = [];
  const rest: string[] = [];
  const unknown: string[] = [];

  // Populate defaults and build alias map
  for (const [name, def] of Object.entries(defs)) {
    if (def.default !== undefined) {
      // A default that violates `choices` is a configuration bug — fail loudly
      // instead of letting an invalid value silently flow through to the handler.
      if (def.choices) {
        const values = Array.isArray(def.default) ? def.default : [def.default];
        for (const v of values) {
          if (!def.choices.includes(v as string | number)) {
            throw new ArgError(
              `Default value "${String(v)}" for --${name} is not one of the choices: ${def.choices.join(", ")}`,
              name,
            );
          }
        }
      }
      flags[name] = def.default as FlagValue;
    } else if (def.multiple) flags[name] = [];
    if (def.alias) aliasMap.set(def.alias, name);
  }

  function resolveName(raw: string): string {
    return aliasMap.get(raw) ?? raw;
  }

  function hasDef(name: string): boolean {
    return HAS_OWN.call(defs, name);
  }

  function coerce(name: string, value: string): string | number | boolean {
    const def = defs[name];
    if (!def) return value;
    switch (def.type) {
      case "number": {
        // An empty string would silently coerce to 0 via Number("") — treat
        // `--port=` as a missing value instead of accepting a phantom zero.
        if (value === "") {
          throw new ArgError(`Missing value for --${name}`, name);
        }
        const n = Number(value);
        if (!Number.isFinite(n)) {
          throw new ArgError(`Expected number for --${name}, got "${value}"`, name);
        }
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
        name,
      );
    }
  }

  function assignValue(name: string, value: string | number | boolean): void {
    const def = defs[name];
    validateChoices(name, value);
    if (def?.multiple) {
      const existing = userProvided.has(name) ? (flags[name] as (string | number | boolean)[]) : [];
      existing.push(value);
      flags[name] = existing as readonly (string | number)[];
    } else {
      flags[name] = value;
    }
    userProvided.add(name);
  }

  /**
   * `-12`, `-3.14`, and `-1e3` should be consumable as VALUES, not parsed as
   * flags. A bare `-` is not a flag either. Anything else that starts with
   * `-` is treated as a flag.
   */
  function looksLikeFlag(token: string | undefined): boolean {
    if (token === undefined) return false;
    if (token.length < 2 || token[0] !== "-") return false;
    // Negative number literal (including scientific notation) — treat as a value.
    if (/^-\d+(\.\d+)?([eE][+-]?\d+)?$/.test(token)) return false;
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

    // Long flag: --name=value, --name value, --flag, --no-flag
    if (arg.startsWith("--")) {
      const eqIdx = arg.indexOf("=");
      if (eqIdx !== -1) {
        const rawNameLiteral = arg.slice(2, eqIdx);
        // `--no-foo=…` is ambiguous: the user wrote the negation form AND
        // supplied a value. Reject loudly when foo is a known boolean instead
        // of silently dropping the directive into `unknown`.
        if (rawNameLiteral.startsWith("no-")) {
          const candidate = resolveName(rawNameLiteral.slice(3));
          if (hasDef(candidate) && defs[candidate]!.type === "boolean") {
            throw new ArgError(
              `Cannot pass a value to negation flag --${rawNameLiteral}. Use --${candidate}=<value> or --${rawNameLiteral} (no value).`,
              candidate,
            );
          }
        }
        const rawName = resolveName(rawNameLiteral);
        const val = arg.slice(eqIdx + 1);
        if (isPrototypePollutionKey(rawName)) {
          unknown.push(rawName);
        } else if (!hasDef(rawName) && !opts.allowUnknown) {
          unknown.push(rawName);
        } else if (!hasDef(rawName)) {
          flags[rawName] = val;
          userProvided.add(rawName);
        } else {
          assignValue(rawName, coerce(rawName, val));
        }
      } else {
        const bareName = arg.slice(2);
        // --no-foo negation: only honored when "foo" is a known boolean flag.
        let negated = false;
        let rawName: string;
        if (bareName.startsWith("no-")) {
          const candidate = resolveName(bareName.slice(3));
          if (hasDef(candidate) && defs[candidate]!.type === "boolean") {
            rawName = candidate;
            negated = true;
          } else {
            rawName = resolveName(bareName);
          }
        } else {
          rawName = resolveName(bareName);
        }

        const def = hasDef(rawName) ? defs[rawName] : undefined;
        if (isPrototypePollutionKey(rawName)) {
          unknown.push(rawName);
        } else if (!def && !opts.allowUnknown) {
          unknown.push(rawName);
        } else if (!def || def.type === "boolean") {
          assignValue(rawName, !negated);
        } else {
          const next = argv[i + 1];
          if (next === undefined || looksLikeFlag(next)) {
            throw new ArgError(`Missing value for --${rawName}`, rawName);
          }
          assignValue(rawName, coerce(rawName, next));
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
        const def = hasDef(rawName) ? defs[rawName] : undefined;
        if (isPrototypePollutionKey(rawName)) {
          unknown.push(rawName);
        } else if (!def && !opts.allowUnknown) {
          unknown.push(rawName);
        } else if (!def || def.type === "boolean") {
          assignValue(rawName, true);
        } else {
          const next = argv[i + 1];
          if (next === undefined || looksLikeFlag(next)) {
            throw new ArgError(`Missing value for -${chars}`, rawName);
          }
          assignValue(rawName, coerce(rawName, next));
          i++;
        }
      } else {
        // Stacked short flags: each must resolve to a boolean def.
        for (const ch of chars) {
          const rawName = resolveName(ch);
          const def = hasDef(rawName) ? defs[rawName] : undefined;
          if (isPrototypePollutionKey(rawName)) {
            unknown.push(rawName);
            continue;
          }
          if (!def) {
            if (opts.allowUnknown) {
              flags[rawName] = true;
              userProvided.add(rawName);
            } else {
              unknown.push(rawName);
            }
            continue;
          }
          if (def.type !== "boolean") {
            throw new ArgError(
              `Cannot stack non-boolean flag -${ch} (--${rawName} expects a value)`,
              rawName,
            );
          }
          assignValue(rawName, true);
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

  // Check required — based on whether the USER provided the flag,
  // not whether a default exists.
  for (const [name, def] of Object.entries(defs)) {
    if (def.required && !userProvided.has(name)) {
      throw new ArgError(`Missing required flag: --${name}`, name);
    }
  }

  // Copy null-prototype object onto a real {} so downstream consumers
  // (JSON.stringify, util.inspect, etc.) behave as expected.
  const safeFlags: Record<string, FlagValue> = { ...flags };

  return { flags: safeFlags as ParsedArgs["flags"], positional, rest, unknown };
}
