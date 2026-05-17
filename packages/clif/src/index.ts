/**
 * clif — Tiny, zero-dependency CLI framework.
 *
 * @example
 * ```ts
 * import { createCLI, bold, cyan, box, log } from "clif";
 *
 * const cli = createCLI({
 *   name: "myapp",
 *   version: "1.0.0",
 *   description: "My awesome CLI",
 *   handler: (ctx) => {
 *     log.info(bold("Hello from " + cyan("clif") + "!"));
 *   },
 * });
 *
 * cli.run();
 * ```
 */

// Core
export { parseArgs, ArgError } from "./core/args.js";
export type { ArgDef, ParsedArgs, ParseOptions } from "./core/args.js";

export { createCLI } from "./core/command.js";
export type { CommandDef, CommandContext, RunOptions } from "./core/command.js";

// Colors
export {
  // Detection
  colorLevel,
  isColorSupported,
  // Modifiers
  reset,
  bold,
  dim,
  italic,
  underline,
  inverse,
  hidden,
  strikethrough,
  // Foreground
  black,
  red,
  green,
  yellow,
  blue,
  magenta,
  cyan,
  white,
  gray,
  grey,
  redBright,
  greenBright,
  yellowBright,
  blueBright,
  magentaBright,
  cyanBright,
  whiteBright,
  // Background
  bgBlack,
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,
  bgGray,
  bgRedBright,
  bgGreenBright,
  bgYellowBright,
  bgBlueBright,
  bgMagentaBright,
  bgCyanBright,
  bgWhiteBright,
  // Extended
  rgb256,
  bgRgb256,
  rgb,
  bgRgb,
  hex,
  bgHex,
  // Utilities
  compose,
  stripAnsi,
  visibleLength,
} from "./core/colors.js";
export type { Formatter } from "./core/colors.js";

// Output components
export {
  box,
  table,
  keyValue,
  list,
  tree,
  createSpinner,
  createProgress,
  divider,
  banner,
  log,
} from "./output/components.js";
export type {
  BoxOptions,
  BoxBorder,
  TableOptions,
  KeyValueOptions,
  ListOptions,
  TreeNode,
  SpinnerOptions,
  ProgressOptions,
} from "./output/components.js";

// Utilities
export {
  isTTY,
  terminalWidth,
  truncate,
  wordWrap,
  indent,
  dedent,
  formatBytes,
  formatDuration,
} from "./utils/helpers.js";
