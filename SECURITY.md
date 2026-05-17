# Security Policy

## Supported versions

`clif` follows semantic versioning. Only the latest major release line
receives security fixes.

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |
| < 1.0   | ❌        |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use **[GitHub's private vulnerability reporting](https://github.com/arshad-shah/clif/security/advisories/new)**
to send a report. It routes directly to the maintainers and stays private
until a fix ships.

If GitHub's flow isn't usable for you, email **security@arshadshah.com**.
Please include:

- A description of the issue and its impact
- Step-by-step reproduction (a minimal repo or a curl/CLI snippet)
- The affected `clif` version(s)
- Any proof-of-concept code

## What to expect

- **Acknowledgement** within **2 business days**.
- **Triage and severity assessment** within **7 days** (CVSS 3.1 score).
- **Coordinated disclosure**: we'll work with you on a fix timeline,
  request a CVE if appropriate, and credit you in the advisory unless
  you prefer to remain anonymous.

For critical issues we aim to ship a patched release within **14 days** of
confirmation.

## Scope

In-scope:

- The `clif` package as published to npm
- Code under `packages/clif/`

Out-of-scope:

- The documentation site (`packages/docs`) and example CLI
  (`packages/example`) — they're not published and don't run with elevated
  privileges
- Issues that require a malicious local machine, malicious dependencies
  installed alongside `clif`, or compromised npm credentials
- Denial-of-service against a CLI that the consumer's own code constructs
  using `clif` — this is normal CLI-input handling and is the consumer's
  responsibility
