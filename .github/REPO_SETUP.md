# Repository setup runbook

Settings that have to be applied on the GitHub / npm / Cloudflare sides
of the world — they can't live in the repo's source. Run through this
once after the first push to `main`. Most of these only need to happen
on the first release.

Where a `gh` command is given, you can paste it directly (after
`gh auth login`). Where settings are UI-only, the navigation path is
listed.

---

## 1. GitHub repository settings

### Visibility

Make the repository **public** (it has to be public for npm provenance
attestations to work — the OIDC verifier needs to read the workflow):

```bash
gh repo edit arshad-shah/clif --visibility public
```

### General settings

```bash
gh repo edit arshad-shah/clif \
  --description "Tiny, zero-dependency CLI framework with beautiful output and a composable API." \
  --homepage "https://clif.arshadshah.com" \
  --enable-issues=true \
  --enable-discussions=true \
  --enable-wiki=false \
  --enable-projects=false \
  --enable-auto-merge=true \
  --enable-rebase-merge=true \
  --enable-merge-commit=false \
  --enable-squash-merge=true \
  --delete-branch-on-merge=true \
  --allow-update-branch=true
```

### Topics (for npm / GitHub discoverability)

```bash
gh repo edit arshad-shah/clif \
  --add-topic cli \
  --add-topic typescript \
  --add-topic nodejs \
  --add-topic terminal \
  --add-topic prompts \
  --add-topic colors \
  --add-topic spinner \
  --add-topic zero-dependency \
  --add-topic framework
```

---

## 2. Branch protection — `main`

Anything reaching `main` should already have passed CI. The release
workflow runs on every push to `main`, so blocking direct pushes also
prevents accidental releases.

Apply via the API (this is the only reliable way — the UI changes
constantly):

```bash
gh api -X PUT "repos/arshad-shah/clif/branches/main/protection" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "lint · typecheck · test · build · validate (22)",
      "lint · typecheck · test · build · validate (24)",
      "dependency audit"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true,
  "restrictions": null
}
JSON
```

**Notes**

- `required_status_checks.contexts` must match the **job names** the CI
  workflow emits. The matrix job in `.github/workflows/ci.yml` is named
  `lint · typecheck · test · build · validate` with `(node-version)`
  appended by Actions. If you change the job name or matrix, update this
  list.
- `enforce_admins: false` so the maintainer can hotfix without ceremony.
  Flip to `true` if you ever onboard co-maintainers.
- `required_linear_history: true` forbids merge commits — combined with
  the squash-merge setting above, every change becomes one clean commit
  on `main`.

---

## 3. GitHub Environment — `npm-publish`

The release workflow is pinned to an environment so npm publishes
require an explicit approval step. This prevents an attacker who
compromises a contributor account from silently shipping a malicious
release.

Create the environment with a required reviewer:

```bash
# Look up your user ID first if you don't already know it:
gh api user --jq '.id'

# Create the environment and require yourself as a reviewer.
gh api -X PUT "repos/arshad-shah/clif/environments/npm-publish" \
  --input - <<'JSON'
{
  "wait_timer": 0,
  "reviewers": [
    { "type": "User", "id": REPLACE_WITH_YOUR_USER_ID }
  ],
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
JSON
```

**What this does**

- Every time `release.yml` reaches the `release` job it pauses for
  approval. You get a notification; clicking "Approve" lets it run.
- `protected_branches: true` means only refs covered by branch
  protection (i.e. `main`) can deploy to this environment — so even
  a malicious branch in a fork can't trigger a publish.

---

## 4. npm trusted publisher (OIDC)

This is the most important security setup. Once configured, **no
`NPM_TOKEN` lives anywhere** — neither in repo secrets nor on a
developer machine. The npm CLI mints short-lived publish credentials
from the GitHub OIDC token at publish time, scoped to one specific
workflow on one specific repo.

### Pre-requisites

- The `clif` package must already exist on npm (publish `1.0.0`
  manually the very first time using `npm publish --provenance` with
  your local credentials — npm needs the package to exist before you
  can configure a publisher for it).
- You need to be an npm package owner or have publish rights.

### Configure on npmjs.com

1. Log in at <https://www.npmjs.com>.
2. Go to <https://www.npmjs.com/package/clif/access>.
3. Under **Trusted Publishers**, click **Add trusted publisher** →
   **GitHub Actions**.
4. Fill in:
   - Organization or user: `arshad-shah`
   - Repository: `clif`
   - Workflow filename: `release.yml`
   - Environment name: `npm-publish`
5. Save.

From this point on, the release workflow can publish without any
secrets — `id-token: write` permission (already set in `release.yml`)
is sufficient.

### Verifying provenance

After the first OIDC publish, check the provenance card on npm:

```
https://www.npmjs.com/package/clif/v/1.0.0
```

There should be a green "Built and signed on GitHub Actions" badge
linking to the exact workflow run that published it.

---

## 5. Cloudflare Pages — docs site at `clif.arshadshah.com`

The Starlight site under `packages/docs` deploys as static HTML. Wire
it up once on Cloudflare:

1. Cloudflare dashboard → **Workers & Pages** → **Create application**
   → **Pages** → **Connect to Git**.
2. Pick the `clif` repository, branch `main`.
3. Build settings:
   - **Framework preset**: Astro
   - **Build command**: `pnpm install --frozen-lockfile && pnpm docs:build`
   - **Build output**: `packages/docs/dist`
   - **Root directory**: `/`
   - **Environment variables**: set `NODE_VERSION=24`
4. Save and deploy.
5. **Custom domain**: Cloudflare → Pages project → **Custom domains** →
   **Set up a custom domain** → `clif.arshadshah.com`. Cloudflare adds
   the CNAME automatically if your DNS is on Cloudflare; otherwise add
   the CNAME manually.

The `site` field in `packages/docs/astro.config.mjs` is already set to
`https://clif.arshadshah.com`, so the sitemap and canonical URLs
generate correctly.

---

## 6. First release — checklist

When you're ready to ship `1.0.0`:

```bash
# Local sanity
pnpm install
pnpm --filter clif validate    # build + publint + smoke + size
pnpm test                       # 172 / 172 pass

# Push everything
git push -u origin main

# Wait for CI to go green, then publish 1.0.0 manually ONCE so npm
# accepts the trusted publisher configuration (step 4 above requires
# the package to exist). After this first publish, all future releases
# come from the release.yml workflow automatically.
cd packages/clif
npm publish --provenance --access public
```

After that:

1. Configure the trusted publisher on npmjs.com (step 4).
2. From now on, every change with a `.changeset/*.md` triggers a
   "Version Packages" PR on merge to `main`. Merging that PR makes
   `release.yml` run `pnpm release`, which:
   - publishes to npm (OIDC, no token),
   - creates a `clif@1.x.y` git tag,
   - cuts a GitHub Release with the CHANGELOG entry as the body.

---

## 7. Optional hardening

- **Code scanning** (CodeQL): enabled automatically once the repo is
  public. Confirm at _Settings → Security and analysis_.
- **Secret scanning + push protection**: same place, flip both on.
- **Dependabot alerts + security updates**: same page, on by default
  for public repos.
- **Restrict `GITHUB_TOKEN` to read-only by default**:
  _Settings → Actions → General → Workflow permissions_ → "Read repository
  contents and packages permissions" + uncheck "Allow GitHub Actions to
  create and approve pull requests". The workflows that need write
  permission already declare it explicitly.
