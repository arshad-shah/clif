/**
 * clif/prompts — Interactive terminal prompts.
 *
 * Separated from the main entry to keep the core bundle tiny
 * when prompts aren't needed.
 *
 * @example
 * ```ts
 * import { text, select, confirm } from "clif/prompts";
 *
 * const name = await text({ message: "Your name?" });
 * const framework = await select({
 *   message: "Pick a framework",
 *   options: [
 *     { label: "React", value: "react" },
 *     { label: "Vue", value: "vue" },
 *   ],
 * });
 * ```
 */

export {
  text,
  password,
  confirm,
  select,
  multiselect,
  number,
  group,
} from "./prompts/prompts.js";

export type {
  TextOptions,
  PasswordOptions,
  ConfirmOptions,
  SelectOption,
  SelectOptions,
  MultiSelectOptions,
  NumberOptions,
} from "./prompts/prompts.js";
