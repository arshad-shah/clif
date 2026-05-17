# clif

> Tiny, zero-dependency CLI framework with beautiful output and a composable API.

`clif` replaces `commander`, `chalk`, `inquirer`, `ora`, and `cli-table3` in a
single package — under 15 KB gzipped, zero runtime dependencies, fully tree-shakeable.

```bash
npm install clif
```

## At a glance

```ts
import { createCLI, bold, cyan, box, log } from "clif";

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
- **Colors** — 16/256/truecolor + modifiers, NO_COLOR/FORCE_COLOR aware
- **Output** — `box`, `table`, `keyValue`, `list`, `tree`, `divider`, `banner`, `log`
- **Async UI** — `createSpinner`, `createProgress`
- **Prompts** (`clif/prompts`) — `text`, `password`, `confirm`, `select`, `multiselect`, `number`, `group`
- **Commands** — composable nested subcommands with automatic `--help` / `--version`

## Design principles

- Zero dependencies — nothing in `node_modules` except clif
- Composable — every function is standalone, pure where possible
- Tree-shakeable — split entry points (`clif`, `clif/prompts`)
- Type-safe — strict TypeScript end to end
- Testable — output components return strings
- Respectful — honors `NO_COLOR`, `FORCE_COLOR`, pipe detection, terminal width

## Documentation

Full docs at [the docs site](https://github.com/arshad-shah/clif) — guides for
every component, the prompts API, and the command system.

## License

MIT
