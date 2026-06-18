# clif

[![CI](https://github.com/arshad-shah/clif/actions/workflows/ci.yml/badge.svg)](https://github.com/arshad-shah/clif/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@arshad-shah/clif?logo=npm)](https://www.npmjs.com/package/@arshad-shah/clif)
[![npm downloads](https://img.shields.io/npm/dm/@arshad-shah/clif?logo=npm&color=cb3837)](https://www.npmjs.com/package/@arshad-shah/clif)
[![bundle size](https://img.shields.io/bundlejs/size/@arshad-shah/clif?label=bundle&color=f5c76a)](https://bundlejs.com/?q=@arshad-shah/clif)
[![License: MIT](https://img.shields.io/npm/l/@arshad-shah/clif?color=blue)](../../LICENSE)
[![types: included](https://img.shields.io/npm/types/@arshad-shah/clif?logo=typescript)](./src)
[![provenance](https://img.shields.io/badge/npm-provenance-2bbc8a?logo=npm)](https://docs.npmjs.com/generating-provenance-statements)

> Tiny, zero-dependency CLI framework with beautiful output and a composable API.

`clif` (published as `@arshad-shah/clif`) replaces `commander`, `chalk`,
`inquirer`, `ora`, and `cli-table3` in a single package — under 16 KB gzipped,
zero runtime dependencies, fully tree-shakeable.

```bash
npm install @arshad-shah/clif
```

## At a glance

```ts
import { createCLI, bold, cyan, box, log } from "@arshad-shah/clif";

const cli = createCLI({
  name: "myapp",
  version: "1.0.0",
  description: "My awesome CLI",
  handler: () => {
    log.success(box(bold("hello from " + cyan("clif")), { border: "round" }));
  },
});

cli.run();
```

## What's included

- **Argument parser** — typed flags, aliases, defaults, choices, positionals, `--` rest
- **Colors** — 16/256/truecolor + modifiers, chainable `style`, `gradient`, `link`, NO_COLOR/FORCE_COLOR aware
- **Output** — `box`, `table`, `keyValue`, `list`, `tree`, `divider`, `banner`, `log`
- **Async UI** — `createSpinner`, `createProgress`, and `createTaskList` (a hierarchical task runner)
- **Prompts** (`@arshad-shah/clif/prompts`) — `text`, `password`, `confirm`, `select`, `multiselect`, `number`, `group`
- **Banner** (`@arshad-shah/clif/banner`) — a FIGfont ASCII-art engine: `figlet`, `parseFont`, `registerFont` (bring your own `.flf`)
- **Commands** — composable nested subcommands with automatic `--help` / `--version`

## Design principles

- Zero dependencies — nothing in `node_modules` except clif
- Composable — every function is standalone, pure where possible
- Tree-shakeable — split entry points (`@arshad-shah/clif`, `@arshad-shah/clif/prompts`, `@arshad-shah/clif/banner`)
- Type-safe — strict TypeScript end to end
- Testable — output components return strings
- Respectful — honors `NO_COLOR`, `FORCE_COLOR`, pipe detection, terminal width

## Documentation

Full docs at **[clif.arshadshah.com](https://clif.arshadshah.com)** — guides
for every component, the prompts API, and the command system.

## License

MIT
