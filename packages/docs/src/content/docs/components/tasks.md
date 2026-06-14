---
title: Tasks
description: Orchestrate a tree of steps with live, nested status output.
---

`createTaskList` runs a tree of steps — a run is a step, with embedded sub-steps —
and renders their status as it goes. On a TTY it repaints an indented tree in
place with a spinner on running steps; in a non-TTY stream (CI logs, files) it
degrades to plain, ordered lines with no cursor-control sequences.

## Basic usage

```typescript
import { createTaskList } from "@arshad-shah/clif";

await createTaskList([
  { title: "Resolve dependencies", task: () => resolve() },
  {
    title: "Build",
    task: async (t) => {
      t.update("compiling…"); // live label while it runs
      await compile();
    },
    children: [
      { title: "Lint", task: () => lint() },
      { title: "Typecheck", task: () => typecheck() },
    ],
  },
]).run();
```

```
✔ Resolve dependencies
✔ Build
  ✔ Lint
  ✔ Typecheck
```

A step's own `task` runs before its `children`. Statuses render as pending
(`○`), running (animated spinner), success (`✔`), failed (`✖`), and skipped
(`⊘`).

## Skipping steps

Return a string from `skip()` to record a reason (shown next to the `⊘` glyph),
`true` to skip silently, or a falsy value to run normally.

```typescript
await createTaskList([
  {
    title: "Publish",
    task: () => publish(),
    skip: () => (process.env.DRY_RUN ? "dry run" : false),
  },
]).run();
// ⊘ Publish (dry run)
```

## Concurrency

Set `concurrent: true` on a node to run its `children` in parallel, or on the
list options to parallelise the top-level steps.

```typescript
await createTaskList([
  {
    title: "Checks",
    concurrent: true,
    children: [
      { title: "Unit tests", task: () => unit() },
      { title: "Integration tests", task: () => integration() },
    ],
  },
]).run();
```

## Errors

By default the first failure aborts the run and `run()` rejects with that error
(remaining steps are left un-run). Pass `continueOnError: true` to keep going and
inspect the collected failures in the result instead.

```typescript
const result = await createTaskList(tasks, { continueOnError: true }).run();

if (!result.ok) {
  for (const { title, error } of result.errors) {
    console.error(`${title}: ${error.message}`);
  }
}
```

`run()` resolves with `{ ok: boolean; errors: { title: string; error: Error }[] }`.

## Task node

| Field        | Type                                          | Description                                            |
| ------------ | --------------------------------------------- | ------------------------------------------------------ |
| `title`      | `string`                                      | Step label                                             |
| `task`       | `(ctx: TaskContext) => void \| Promise<void>` | Work to run; `ctx.update(text)` changes the live label |
| `children`   | `TaskNode[]`                                  | Embedded sub-steps, run after this step's own `task`   |
| `skip`       | `() => boolean \| string \| Promise<…>`       | Skip with an optional reason                           |
| `concurrent` | `boolean`                                     | Run this node's children in parallel                   |

## List options

| Option            | Type             | Default  | Description                                   |
| ----------------- | ---------------- | -------- | --------------------------------------------- |
| `concurrent`      | `boolean`        | `false`  | Run the top-level steps in parallel           |
| `continueOnError` | `boolean`        | `false`  | Keep going after a failure and collect errors |
| `interval`        | `number`         | `80`     | Spinner frame interval (ms)                   |
| `color`           | `Formatter`      | `cyan`   | Spinner frame color                           |
| `stream`          | `WritableStream` | `stderr` | Output stream                                 |
