---
title: Spinner & Progress
description: Animated spinners and progress bars for long-running operations.
---

## Spinner

```typescript
import { createSpinner } from "@arshad-shah/clif";

const spinner = createSpinner({ text: "Installing dependencies..." });
spinner.start();

// Update mid-task
spinner.update("Compiling TypeScript...");

// Finish with a state
spinner.succeed("Build complete");
// or
spinner.fail("Build failed");
spinner.warn("Build succeeded with warnings");
spinner.info("Build skipped — no changes");
```

### Spinner options

| Option     | Type             | Default      | Description         |
| ---------- | ---------------- | ------------ | ------------------- |
| `text`     | `string`         | `""`         | Spinner label       |
| `frames`   | `string[]`       | braille dots | Animation frames    |
| `interval` | `number`         | `80`         | Frame interval (ms) |
| `color`    | `Formatter`      | `cyan`       | Frame color         |
| `stream`   | `WritableStream` | `stderr`     | Output stream       |

## Progress bar

```typescript
import { createProgress } from "@arshad-shah/clif";

const bar = createProgress({ total: 100 });

for (let i = 0; i < 100; i++) {
  await doWork();
  bar.tick();
}
// █████████████████████████████░ 97% 97/100

// Or set absolute value
bar.update(50);
```

### Progress options

| Option       | Type        | Default                         | Description        |
| ------------ | ----------- | ------------------------------- | ------------------ |
| `total`      | `number`    | required                        | Total steps        |
| `width`      | `number`    | `30`                            | Bar width in chars |
| `complete`   | `string`    | `█`                             | Filled character   |
| `incomplete` | `string`    | `░`                             | Empty character    |
| `format`     | `string`    | `:bar :percent :current/:total` | Output format      |
| `color`      | `Formatter` | `green`                         | Bar color          |
