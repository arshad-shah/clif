---
"clif": patch
---

Remove the broken `bin` field from `package.json`.

`bin: { "clif": "./dist/bin.js" }` referenced an entry that `tsdown` never
builds, causing a pnpm install warning on every install
(`Failed to create bin … bin.js.EXE`). `clif` is a framework consumed by
other CLIs, not itself a CLI binary, so the field had no purpose.
