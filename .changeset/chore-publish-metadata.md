---
"clif": patch
---

Polish package metadata for v1 publishing.

- Add `repository`, `bugs`, `homepage` fields.
- Add `publishConfig: { access: "public", provenance: true }` for npm
  provenance attestations on release.
- Add `sideEffects: false` to enable stricter tree-shaking by bundlers.
- Add `./package.json` to the `exports` map (consumers occasionally need it).
- Expand `keywords` for discoverability.
- Add `@types/node` as a devDependency and `types: ["node"]` to
  `tsconfig.json` so strict `tsc --noEmit` catches missing ambient
  types before they leak into the published `.d.mts`.
