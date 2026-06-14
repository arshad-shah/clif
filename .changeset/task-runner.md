---
"@arshad-shah/clif": minor
---

Add **`createTaskList`** — a hierarchical task runner. A run is a step with
embedded sub-steps; the orchestrator awaits each `task` and renders live status
as an indented tree (animated spinner on running steps, `✔`/`✖`/`⊘` on settle).
On a TTY it repaints in place; in a non-TTY stream it degrades to plain, ordered
lines with no cursor-control sequences.

```ts
await createTaskList([
  { title: "Resolve deps", task: () => resolve() },
  {
    title: "Build",
    task: async (t) => {
      t.update("compiling…");
      await compile();
    },
    children: [
      { title: "Lint", task: () => lint() },
      { title: "Typecheck", task: () => typecheck() },
    ],
  },
]).run();
```

- **Embedded steps** via `children` (a step's own `task` runs before its kids).
- **`skip()`** — return a reason string (rendered `⊘ title (reason)`), `true` to
  skip silently, or falsy to run.
- **Concurrency** — `concurrent: true` on a node runs its children in parallel,
  or on the list options to parallelise the top level.
- **`continueOnError`** — keep going after a failure and inspect
  `result.errors`; otherwise the first failure aborts and `run()` rejects.
- **Live label** — `ctx.update(text)` changes a running step's label.

Exposes `TaskNode`, `TaskContext`, `TaskListOptions`, `TaskListResult`, and
`TaskStatus`.
