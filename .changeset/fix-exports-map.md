---
"clif": patch
---

Fix `exports` map to reference the actual emitted artifact extensions.

The map previously declared `./dist/index.js` and `./dist/index.d.ts` while
`tsdown` emits `./dist/index.mjs` and `./dist/index.d.mts`. This made the
published package un-importable under strict module resolution (pnpm + Node 24
+ TypeScript bundler mode). Aligned `main` / `module` / `types` / `exports`
with the actual emitted artifacts.
