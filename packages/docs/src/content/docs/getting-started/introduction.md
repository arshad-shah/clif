---
title: Introduction
description: What is clif and why does it exist?
---

**clif** is a tiny, zero-dependency CLI framework for Node.js. It replaces the need for `commander`, `chalk`, `inquirer`, `ora`, and `cli-table3` — all in a single, composable package under 15 KB gzipped.

## Why clif?

Building CLI tools in Node.js typically means pulling in a constellation of packages:

- `commander` or `yargs` for argument parsing
- `chalk` or `kleur` for colors
- `inquirer` or `prompts` for interactive input
- `ora` for spinners
- `cli-progress` for progress bars
- `cli-table3` for tables

Each comes with its own API patterns, version constraints, and transitive dependencies. **clif** unifies all of this into one package with zero dependencies.

## Design principles

- **Zero dependencies** — nothing in `node_modules` except clif itself
- **Composable** — every function is standalone, pure where possible, and returns strings
- **Tree-shakeable** — import only what you need via `clif` or `clif/prompts`
- **Fast** — no startup overhead, no config parsing, no plugin system
- **Type-safe** — full TypeScript with strict types throughout
- **Testable** — output components return strings, making unit testing trivial
- **Respectful** — honors `NO_COLOR`, `FORCE_COLOR`, pipe detection, and terminal width

## What's included

| Module      | Replaces          | Description                                           |
| ----------- | ----------------- | ----------------------------------------------------- |
| Colors      | chalk, kleur      | Full ANSI palette, 256-color, truecolor, hex, compose |
| Args        | commander, yargs  | Flag parsing, types, aliases, choices, defaults       |
| Commands    | commander         | Nested subcommands, setup hooks, auto-help            |
| Box         | boxen             | Bordered boxes with 5 styles, titles, alignment       |
| Table       | cli-table3        | Column-aligned tables with headers and borders        |
| List / Tree | —                 | Ordered/unordered lists, recursive tree rendering     |
| Spinner     | ora               | Animated spinner with succeed/fail/warn states        |
| Progress    | cli-progress      | Progress bar with customizable format                 |
| Prompts     | inquirer, prompts | text, password, confirm, select, multiselect, number  |
