/**
 * clif/tui/keys — Streaming keyboard decoder.
 *
 * Raw stdin delivers bytes, not keystrokes: an arrow key is the three-byte
 * sequence `ESC [ A`, and the terminal is free to split that across two `data`
 * events. {@link createKeyDecoder} buffers partial input so a sequence straddling
 * a chunk boundary still decodes to a single {@link Key}, and a lone `ESC`
 * (followed by unrelated input) still surfaces as Escape.
 *
 * Mouse reporting is intentionally out of scope for v1.
 */

const ESC = "\x1b";

export type KeyName =
  | "up"
  | "down"
  | "left"
  | "right"
  | "home"
  | "end"
  | "pageup"
  | "pagedown"
  | "enter"
  | "escape"
  | "tab"
  | "backtab"
  | "backspace"
  | "delete"
  | "space"
  | "char"
  | "unknown";

export interface Key {
  /** Semantic name of the key. Printable input is `"char"` (see {@link Key.char}). */
  name: KeyName;
  /** The printable character for `name === "char"`; for a Ctrl combo, the letter (e.g. `"c"`). */
  char?: string;
  /** True when a Ctrl modifier was held (e.g. Ctrl+C → `{ name: "char", char: "c", ctrl: true }`). */
  ctrl: boolean;
  /** True for Shift+Tab; other Shift combinations are not distinguished. */
  shift: boolean;
  /** The raw bytes this key decoded from. */
  raw: string;
}

/** Full escape sequences we recognise, mapped to their decoded key. */
const SEQUENCES: Record<string, Key> = {
  "[A": key("up"),
  "[B": key("down"),
  "[C": key("right"),
  "[D": key("left"),
  "[H": key("home"),
  "[F": key("end"),
  "[1~": key("home"),
  "[7~": key("home"),
  "[4~": key("end"),
  "[8~": key("end"),
  "[3~": key("delete"),
  "[5~": key("pageup"),
  "[6~": key("pagedown"),
  "[Z": { name: "backtab", ctrl: false, shift: true, raw: `${ESC}[Z` },
  // Application cursor mode (DECCKM) emits `ESC O x` instead of `ESC [ x`.
  OA: key("up"),
  OB: key("down"),
  OC: key("right"),
  OD: key("left"),
  OH: key("home"),
  OF: key("end"),
};

function key(name: KeyName, extra?: Partial<Key>): Key {
  return { name, ctrl: false, shift: false, raw: "", ...extra };
}

/**
 * After `ESC`, is `rest` (everything following the ESC) still possibly the
 * prefix of a longer sequence we'd recognise? If so the decoder waits for more
 * bytes rather than mis-reporting a lone Escape.
 */
function couldCompleteEscape(rest: string): boolean {
  if (rest === "") return true; // bare ESC so far
  if (rest === "[" || rest === "O") return true; // CSI / SS3 introducer
  // A CSI sequence whose parameter bytes haven't been terminated yet.
  if (/^\[[0-9;]*$/.test(rest)) return true;
  return false;
}

/** Decode a single non-escape control / printable code point into a {@link Key}. */
function decodeChar(ch: string): Key {
  const code = ch.codePointAt(0)!;
  if (ch === "\r" || ch === "\n") return key("enter", { raw: ch });
  if (ch === "\t") return key("tab", { raw: ch });
  if (ch === "\x7f" || ch === "\b") return key("backspace", { raw: ch });
  if (ch === " ") return key("space", { char: " ", raw: ch });
  // C0 control range → Ctrl + letter (0x01 = Ctrl+A … 0x1a = Ctrl+Z).
  if (code >= 0x01 && code <= 0x1a) {
    return key("char", { char: String.fromCharCode(code + 96), ctrl: true, raw: ch });
  }
  if (code < 0x20) return key("unknown", { raw: ch });
  return key("char", { char: ch, raw: ch });
}

/**
 * Create a stateful decoder. Feed it raw chunks via `push`; it returns the keys
 * it could fully decode, retaining any trailing partial escape sequence for the
 * next call.
 */
export function createKeyDecoder(): { push(chunk: string): Key[] } {
  let buf = "";

  return {
    push(chunk: string): Key[] {
      buf += chunk;
      const keys: Key[] = [];

      while (buf.length > 0) {
        if (buf[0] !== ESC) {
          // Consume one whole code point (handles astral chars / emoji).
          const ch = String.fromCodePoint(buf.codePointAt(0)!);
          keys.push(decodeChar(ch));
          buf = buf.slice(ch.length);
          continue;
        }

        const rest = buf.slice(1);

        // Try to match the longest known sequence at the cursor.
        let matched: { seq: string; key: Key } | null = null;
        for (const seq of Object.keys(SEQUENCES)) {
          if (rest.startsWith(seq) && (!matched || seq.length > matched.seq.length)) {
            matched = { seq, key: SEQUENCES[seq]! };
          }
        }
        if (matched) {
          const raw = ESC + matched.seq;
          keys.push({ ...matched.key, raw });
          buf = buf.slice(raw.length);
          continue;
        }

        // No full match yet — wait for more bytes if this could still complete.
        if (couldCompleteEscape(rest)) break;

        // Otherwise it's a standalone Escape; emit it and keep parsing `rest`.
        keys.push(key("escape", { raw: ESC }));
        buf = rest;
      }

      return keys;
    },
  };
}
