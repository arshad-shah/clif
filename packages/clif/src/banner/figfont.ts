/**
 * clif/banner — FIGfont v2 engine.
 *
 * A zero-dependency parser and layout engine for FIGfont (`.flf`) data. Lives
 * on the opt-in `@arshad-shah/clif/banner` subpath so font data never lands in
 * the core bundle. Everything here is pure: parsing returns a {@link Font},
 * rendering returns a plain `string[]` grid — colour and alignment are applied
 * by the public layer in `index.ts`.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Horizontal/vertical fitting modes a caller can force, overriding the font. */
export type LayoutMode = "default" | "full" | "fitted";

/** Text flow direction: left-to-right (`0`/`"ltr"`) or right-to-left (`1`/`"rtl"`). */
export type PrintDirection = 0 | 1 | "ltr" | "rtl";

/** The six controlled smushing rules, shared by horizontal and (loosely) vertical. */
interface SmushRules {
  equal: boolean;
  underscore: boolean;
  hierarchy: boolean;
  oppositePair: boolean;
  bigX: boolean;
  hardblank: boolean;
}

type FitMode = "full" | "fit" | "smush";

/** A parsed FIGfont, ready to render. Produced by {@link parseFont}. */
export interface Font {
  /** Glyph height in sub-character rows. */
  height: number;
  /** Distance from the top of the glyph to the baseline. */
  baseline: number;
  /** The hardblank sub-character (rendered as a space in final output). */
  hardblank: string;
  /** Default print direction encoded in the header (0 = LTR, 1 = RTL). */
  printDirection: 0 | 1;
  /** Code point → glyph rows (length === `height`). */
  glyphs: Map<number, readonly string[]>;
  /** Resolved horizontal fitting mode and rules from the header. */
  hMode: FitMode;
  hRules: SmushRules;
  /** Resolved vertical fitting mode and rules from the header. */
  vMode: FitMode;
  vRules: SmushRules;
}

// ── Header / glyph parsing ─────────────────────────────────────────────────────

const REQUIRED_CODES = (() => {
  // ASCII 32–126, then the seven Deutsch code points, in FIGfont order.
  const codes: number[] = [];
  for (let c = 32; c <= 126; c++) codes.push(c);
  codes.push(196, 214, 220, 228, 246, 252, 223);
  return codes;
})();

function noRules(): SmushRules {
  return {
    equal: false,
    underscore: false,
    hierarchy: false,
    oppositePair: false,
    bigX: false,
    hardblank: false,
  };
}

/** Derive the controlled-smushing rule flags from a layout bitmask (low 6 bits). */
function rulesFromMask(mask: number): SmushRules {
  return {
    equal: (mask & 1) !== 0,
    underscore: (mask & 2) !== 0,
    hierarchy: (mask & 4) !== 0,
    oppositePair: (mask & 8) !== 0,
    bigX: (mask & 16) !== 0,
    hardblank: (mask & 32) !== 0,
  };
}

/**
 * Resolve a fitting mode + rules from the legacy `oldLayout` and optional
 * `fullLayout` header fields, per the FIGfont spec. `fullLayout` wins when
 * present; otherwise `oldLayout` is interpreted (`-1` full, `0` kerning,
 * `>0` controlled smushing).
 */
function resolveHorizontal(
  oldLayout: number,
  fullLayout: number | null,
): {
  mode: FitMode;
  rules: SmushRules;
} {
  if (fullLayout !== null) {
    const rules = rulesFromMask(fullLayout);
    let mode: FitMode;
    if ((fullLayout & 128) !== 0) mode = "smush";
    else if ((fullLayout & 64) !== 0) mode = "fit";
    else mode = "full";
    return { mode, rules };
  }
  if (oldLayout < 0) return { mode: "full", rules: noRules() };
  if (oldLayout === 0) return { mode: "fit", rules: noRules() };
  return { mode: "smush", rules: rulesFromMask(oldLayout & 63) };
}

/** Resolve the vertical fitting mode + rules from `fullLayout` bits 8–14. */
function resolveVertical(fullLayout: number | null): { mode: FitMode; rules: SmushRules } {
  if (fullLayout === null) return { mode: "full", rules: noRules() };
  const rules: SmushRules = {
    equal: (fullLayout & 256) !== 0,
    underscore: (fullLayout & 512) !== 0,
    hierarchy: (fullLayout & 1024) !== 0,
    oppositePair: (fullLayout & 2048) !== 0, // horizontal-line rule
    bigX: (fullLayout & 4096) !== 0, // vertical-line supersmush
    hardblank: false,
  };
  let mode: FitMode;
  if ((fullLayout & 16384) !== 0) mode = "smush";
  else if ((fullLayout & 8192) !== 0) mode = "fit";
  else mode = "full";
  return { mode, rules };
}

/**
 * Parse a raw FIGfont (`.flf`) string into a renderable {@link Font}.
 *
 * Accepts standard FIGfont v2 data — header, comment block, the required ASCII
 * and Deutsch glyphs, and any code-tagged glyphs. Throws on a malformed header
 * or truncated glyph data.
 */
export function parseFont(flf: string): Font {
  // Normalise CRLF/CR — several public `.flf` fonts ship with Windows line
  // endings, and a stray `\r` would otherwise be mistaken for the endmark.
  const lines = flf.replace(/\r\n?/g, "\n").split("\n");
  const header = lines[0];
  if (!header || header.slice(0, 5) !== "flf2a") {
    throw new Error('parseFont: not a FIGfont — missing "flf2a" signature');
  }
  // Header: `flf2a<hardblank> height baseline maxLen oldLayout commentLines
  // [printDir] [fullLayout] [codeTagCount]`. The hardblank is the 6th char.
  const hardblank = header[5]!;
  const parts = header.slice(6).trim().split(/\s+/);
  const height = Number.parseInt(parts[0]!, 10);
  const baseline = Number.parseInt(parts[1]!, 10);
  const oldLayout = Number.parseInt(parts[3]!, 10);
  const commentLines = Number.parseInt(parts[4]!, 10);
  const printDirRaw = parts[5] !== undefined ? Number.parseInt(parts[5], 10) : 0;
  const fullLayout = parts[6] !== undefined ? Number.parseInt(parts[6], 10) : null;

  if (!Number.isFinite(height) || height <= 0) {
    throw new Error(`parseFont: invalid height in header (${parts[0]})`);
  }

  const { mode: hMode, rules: hRules } = resolveHorizontal(oldLayout, fullLayout);
  const { mode: vMode, rules: vRules } = resolveVertical(fullLayout);

  // Glyph data begins after the comment block.
  let cursor = 1 + Math.max(0, commentLines);

  /** Read one glyph (`height` rows), stripping trailing endmark characters. */
  const readGlyph = (): string[] | null => {
    if (cursor + height > lines.length) return null;
    const rows: string[] = [];
    for (let r = 0; r < height; r++) {
      let line = lines[cursor++]!;
      // The endmark is the final character of the row; strip its trailing run
      // (one mark on intermediate rows, two on the glyph's last row).
      const endmark = line.charAt(line.length - 1);
      if (endmark) {
        let end = line.length;
        while (end > 0 && line[end - 1] === endmark) end--;
        line = line.slice(0, end);
      }
      rows.push(line);
    }
    return rows;
  };

  const glyphs = new Map<number, readonly string[]>();
  for (const code of REQUIRED_CODES) {
    const glyph = readGlyph();
    if (!glyph) break; // tolerate fonts that omit the Deutsch block
    glyphs.set(code, glyph);
  }

  // Code-tagged glyphs: each preceded by a `code[ comment]` line. The code may
  // be decimal, hex (0x…) or octal (leading 0).
  while (cursor < lines.length) {
    const tag = lines[cursor]!.trim();
    if (tag === "") {
      cursor++;
      continue;
    }
    const codeStr = tag.split(/\s+/)[0]!;
    const code = parseCodeTag(codeStr);
    cursor++;
    const glyph = readGlyph();
    if (glyph === null || Number.isNaN(code)) break;
    glyphs.set(code, glyph);
  }

  return {
    height,
    baseline,
    hardblank,
    printDirection: printDirRaw === 1 ? 1 : 0,
    glyphs,
    hMode,
    hRules,
    vMode,
    vRules,
  };
}

function parseCodeTag(codeStr: string): number {
  if (/^-?0[xX]/.test(codeStr)) return Number.parseInt(codeStr, 16);
  if (/^-?0[0-7]+$/.test(codeStr)) return Number.parseInt(codeStr, 8);
  return Number.parseInt(codeStr, 10);
}

// ── Horizontal smushing ────────────────────────────────────────────────────────

const HIERARCHY_CLASSES = ["|", "/\\", "[]", "{}", "()", "<>"];
const UNDERSCORE_TARGETS = "|/\\[]{}()<>";

/**
 * Smush two non-space sub-characters per the active controlled rules, returning
 * the merged character or `null` when no rule applies (so the caller must keep
 * them in separate columns).
 */
function smushChars(l: string, r: string, hardblank: string, rules: SmushRules): string | null {
  // Hardblank handling (rule 6): only two hardblanks smush, into one hardblank.
  if (l === hardblank || r === hardblank) {
    return rules.hardblank && l === hardblank && r === hardblank ? hardblank : null;
  }
  if (rules.equal && l === r) return l;
  if (rules.underscore) {
    if (l === "_" && UNDERSCORE_TARGETS.includes(r)) return r;
    if (r === "_" && UNDERSCORE_TARGETS.includes(l)) return l;
  }
  if (rules.hierarchy) {
    const lc = HIERARCHY_CLASSES.findIndex((cls) => cls.includes(l));
    const rc = HIERARCHY_CLASSES.findIndex((cls) => cls.includes(r));
    if (lc !== -1 && rc !== -1 && lc !== rc) return lc > rc ? l : r;
  }
  if (rules.oppositePair) {
    const pair = `${l}${r}`;
    if (["[]", "][", "{}", "}{", "()", ")("].includes(pair)) return "|";
  }
  if (rules.bigX) {
    if (l === "/" && r === "\\") return "|";
    if (l === "\\" && r === "/") return "Y";
    if (l === ">" && r === "<") return "X";
  }
  return null;
}

/** Universal smushing: the later (right) sub-character wins, but loses to a visible. */
function smushUniversal(l: string, r: string, hardblank: string): string {
  if (r === hardblank) return l;
  return r;
}

/**
 * Merge the boundary sub-characters of two overlapping columns. Returns the
 * smushed character, or `null` if the columns cannot occupy the same space.
 */
function combine(
  l: string,
  r: string,
  hardblank: string,
  mode: FitMode,
  rules: SmushRules,
): string | null {
  if (l === " ") return r;
  if (r === " ") return l;
  if (mode !== "smush") return null; // fitting never overlaps two visibles
  const anyRule =
    rules.equal ||
    rules.underscore ||
    rules.hierarchy ||
    rules.oppositePair ||
    rules.bigX ||
    rules.hardblank;
  if (!anyRule) return smushUniversal(l, r, hardblank);
  return smushChars(l, r, hardblank, rules);
}

/**
 * Compute how many columns the right glyph can shift left into `left` without
 * an illegal overlap, then return the merged rows.
 */
function appendGlyph(
  left: string[],
  glyph: readonly string[],
  hardblank: string,
  mode: FitMode,
  rules: SmushRules,
): string[] {
  const height = left.length;
  if (mode === "full") {
    return left.map((row, i) => row + glyph[i]!);
  }

  // Largest overlap that every row permits.
  let smush = Number.POSITIVE_INFINITY;
  for (let i = 0; i < height; i++) {
    const lRow = left[i]!;
    const rRow = glyph[i]!;
    const lLen = lRow.length;
    const rLen = rRow.length;

    let lEnd = lLen;
    while (lEnd > 0 && lRow[lEnd - 1] === " ") lEnd--;
    const lTrail = lLen - lEnd;

    let rLead = 0;
    while (rLead < rLen && rRow[rLead] === " ") rLead++;

    let amt = lTrail + rLead;
    if (lEnd > 0 && rLead < rLen) {
      // The two boundary visibles would collide at amt+1 — allow it only if a
      // rule can merge them.
      if (combine(lRow[lEnd - 1]!, rRow[rLead]!, hardblank, mode, rules) !== null) amt += 1;
    }
    amt = Math.min(amt, lLen, rLen);
    smush = Math.min(smush, amt);
  }
  if (!Number.isFinite(smush) || smush < 0) smush = 0;

  // Merge each row with the resolved overlap.
  const out: string[] = [];
  for (let i = 0; i < height; i++) {
    const lRow = left[i]!;
    const rRow = glyph[i]!;
    const lLen = lRow.length;
    const head = lRow.slice(0, lLen - smush);
    let mid = "";
    for (let k = 0; k < smush; k++) {
      const lc = lRow[lLen - smush + k] ?? " ";
      const rc = rRow[k] ?? " ";
      const merged = combine(lc, rc, hardblank, mode, rules);
      mid += merged ?? (lc !== " " ? lc : rc);
    }
    out.push(head + mid + rRow.slice(smush));
  }
  return out;
}

// ── Vertical smushing ──────────────────────────────────────────────────────────

/** Merge two equal-width sub-character rows vertically, or `null` if illegal. */
function combineVertical(
  top: string,
  bottom: string,
  rules: SmushRules,
  mode: FitMode,
): string | null {
  const width = Math.max(top.length, bottom.length);
  const out: string[] = [];
  for (let c = 0; c < width; c++) {
    const t = top[c] ?? " ";
    const b = bottom[c] ?? " ";
    if (t === " ") {
      out.push(b);
      continue;
    }
    if (b === " ") {
      out.push(t);
      continue;
    }
    if (mode !== "smush") return null;
    const anyRule =
      rules.equal || rules.underscore || rules.hierarchy || rules.oppositePair || rules.bigX;
    if (anyRule) {
      if (rules.equal && t === b) {
        out.push(t);
        continue;
      }
      if (rules.underscore) {
        if (t === "_" && UNDERSCORE_TARGETS.includes(b)) {
          out.push(b);
          continue;
        }
        if (b === "_" && UNDERSCORE_TARGETS.includes(t)) {
          out.push(t);
          continue;
        }
      }
      if (rules.hierarchy) {
        const tc = HIERARCHY_CLASSES.findIndex((cls) => cls.includes(t));
        const bc = HIERARCHY_CLASSES.findIndex((cls) => cls.includes(b));
        if (tc !== -1 && bc !== -1 && tc !== bc) {
          out.push(tc > bc ? t : b);
          continue;
        }
      }
      if (rules.oppositePair && ((t === "-" && b === "_") || (t === "_" && b === "-"))) {
        out.push("=");
        continue;
      }
      if (rules.bigX && t === "|" && b === "|") {
        out.push("|");
        continue;
      }
      return null;
    }
    // Universal vertical smush: the lower row wins.
    out.push(b);
  }
  return out.join("");
}

/** Stack `bottom` under `top`, applying the font's vertical fitting if enabled. */
function stackBlocks(top: string[], bottom: string[], font: Font): string[] {
  const width = Math.max(
    top.reduce((m, r) => Math.max(m, r.length), 0),
    bottom.reduce((m, r) => Math.max(m, r.length), 0),
  );
  const pad = (rows: string[]) => rows.map((r) => r.padEnd(width, " "));
  const t = pad(top);
  const b = pad(bottom);
  if (font.vMode === "full" || t.length === 0) return [...top, ...bottom];

  // Find the largest vertical overlap whose every boundary pair is legal.
  let overlap = 0;
  const maxOverlap = Math.min(t.length, b.length);
  for (let cand = 1; cand <= maxOverlap; cand++) {
    let ok = true;
    for (let k = 0; k < cand; k++) {
      const merged = combineVertical(t[t.length - cand + k]!, b[k]!, font.vRules, font.vMode);
      if (merged === null) {
        ok = false;
        break;
      }
    }
    if (ok) overlap = cand;
    else break;
  }

  const head = t.slice(0, t.length - overlap);
  const mid: string[] = [];
  for (let k = 0; k < overlap; k++) {
    mid.push(combineVertical(t[t.length - overlap + k]!, b[k]!, font.vRules, font.vMode) ?? b[k]!);
  }
  const tail = b.slice(overlap);
  return [...head, ...mid, ...tail];
}

// ── Public render core ─────────────────────────────────────────────────────────

/** Options understood by {@link renderFont}. */
export interface RenderOptions {
  horizontalLayout?: LayoutMode;
  verticalLayout?: LayoutMode;
  printDirection?: PrintDirection;
}

/** Resolve the effective horizontal fit mode given a font default + override. */
function effectiveMode(fontMode: FitMode, layout: LayoutMode | undefined): FitMode {
  if (layout === "full") return "full";
  if (layout === "fitted") return "fit";
  return fontMode;
}

function isRTL(font: Font, opt: PrintDirection | undefined): boolean {
  if (opt === undefined) return font.printDirection === 1;
  return opt === 1 || opt === "rtl";
}

/** Render a single line of text (no `\n`) into a sub-character grid. */
function renderLine(text: string, font: Font, mode: FitMode, rtl: boolean): string[] {
  const blank = () => Array.from({ length: font.height }, () => "");
  let rows = blank();
  let started = false;
  const codes = [...text].map((ch) => ch.codePointAt(0)!);
  for (const code of codes) {
    const glyph = font.glyphs.get(code);
    if (!glyph) continue; // skip code points the font doesn't define
    if (!started) {
      rows = glyph.map((r) => r);
      started = true;
    } else if (rtl) {
      // RTL: each successive glyph sits to the LEFT of what precedes it, so the
      // first input character ends up rightmost.
      rows = appendGlyph(glyph.slice(), rows, font.hardblank, mode, font.hRules);
    } else {
      rows = appendGlyph(rows, glyph, font.hardblank, mode, font.hRules);
    }
  }
  if (!started) return blank().map(() => "");
  return rows;
}

/**
 * Render `text` into a grid of sub-character rows using `font`. Pure: returns a
 * `string[]` with the hardblank already substituted back to spaces, every row
 * padded to a uniform width, and no colour or alignment applied.
 *
 * Embedded newlines split the input into stacked blocks (vertical layout
 * applies between them).
 */
export function renderFont(text: string, font: Font, opts: RenderOptions = {}): string[] {
  const mode = effectiveMode(font.hMode, opts.horizontalLayout);
  const rtl = isRTL(font, opts.printDirection);

  const inputLines = text.split("\n");
  let block: string[] = [];
  for (let i = 0; i < inputLines.length; i++) {
    const lineBlock = renderLine(inputLines[i]!, font, mode, rtl);
    block = i === 0 ? lineBlock : stackBlocks(block, lineBlock, font);
  }

  // Substitute hardblanks → spaces and pad to a uniform width so callers (and
  // gradients) see aligned columns.
  const width = block.reduce((m, r) => Math.max(m, r.length), 0);
  const hb = font.hardblank;
  return block.map((row) => {
    const padded = row.padEnd(width, " ");
    return hb === " " ? padded : padded.split(hb).join(" ");
  });
}
