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
export type {
  ArgDef,
  ParsedArgs,
  ParseOptions,
  PositionalDef,
  PositionalValue,
  FlagValueOf,
  FlagsFromDefs,
} from "./core/args.js";

export { createCLI, defineCommand } from "./core/command.js";
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
  rgbToAnsi256,
  rgbToAnsi16,
  // Chainable / composite
  style,
  gradient,
  link,
  // Utilities
  compose,
  stripAnsi,
  visibleLength,
} from "./core/colors.js";
export type { Formatter, Style, ColorStop } from "./core/colors.js";

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
  Align,
  BoxOptions,
  BoxBorder,
  TableOptions,
  KeyValueOptions,
  ListOptions,
  TreeNode,
  SpinnerOptions,
  ProgressOptions,
} from "./output/components.js";

// Task runner
export { createTaskList } from "./output/tasks.js";
export type {
  TaskNode,
  TaskContext,
  TaskListOptions,
  TaskListResult,
  TaskStatus,
} from "./output/tasks.js";

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
