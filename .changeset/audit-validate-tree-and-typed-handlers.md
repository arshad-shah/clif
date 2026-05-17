---
"@arshad-shah/clif": patch
---

**Library audit: tree() depth bug fix + typed command handlers.**

Bug fix:

- `tree()` was double-prefixing every node past depth 2. Each level of
  recursion bakes its column prefix into the lines it emits, but the
  outer loop was also prepending `prefix + childPrefix` to those lines
  when stitching them back together, so a four-level tree got two
  extra indentation columns at the deepest level. The documented
  example in `components/list-tree.md`
  (`src ▸ core ▸ colors.ts`, etc.) now renders exactly as shown in the
  docs:

  ```
  src
  ├── core
  │   ├── colors.ts
  │   └── args.ts
  └── output
      └── components.ts
  ```

  Previously it printed `│   │   ├── colors.ts` (one phantom column
  per nested level). Added regression tests for three- and four-level
  depths and for the mixed-siblings example shipped in the docs.

Type narrowing for command handlers:

- `CommandDef` and `CommandContext` are now generic over the
  command's args record (defaulting to the old shape, so every
  existing import keeps working). `defineCommand` and `createCLI` use
  the TS 5.0 `const` modifier on their type parameter, so an `args`
  literal is inferred narrowly without the caller having to write
  `as const`:

  ```ts
  defineCommand({
    name: "migrate",
    args: { steps: { type: "number", default: 0 } },
    handler: (ctx) => {
      const n: number = ctx.args.flags.steps; // ✓ typed as number
    },
  });
  ```

  This brings the runtime in line with the long-standing claim in
  `guides/commands.md` that `ctx.args.flags.<name>` is "fully typed"
  inside handlers. Subcommand arrays still accept commands with any
  args shape (`commands?: CommandDef<any>[]`), so heterogeneous
  command trees compose without per-entry type gymnastics.
