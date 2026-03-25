---
name: verify
description: >
  Run all verification checks: typecheck, tests, and build for both api and web apps.
  Trigger: /verify, "run checks", "verify build", "check everything passes", "is it all green"
---

# Verify

## When to Use
Before declaring any work complete. Before committing. Before creating a PR.

## Procedure

### Step 1: Type Check
```bash
pnpm --filter api tsc --noEmit
pnpm --filter web tsc --noEmit
```
If either fails: fix type errors before continuing. Do not proceed to Step 2.

### Step 2: Tests
```bash
pnpm --filter api test
pnpm --filter web test
```
If either fails: fix failing tests before continuing. Do not proceed to Step 3.

### Step 3: Build
```bash
pnpm --filter api build
pnpm --filter web build
```
`tsc --noEmit` and the actual build can diverge — always run both.

## Exit Codes
- **0** — All six commands pass
- **1** — Any step fails — do not declare work complete, do not commit

## What NOT to Do
- Do not skip build because tests passed
- Do not run only one app — both api and web must pass
- Do not declare "done" if any step fails
- Do not re-run the same failing command more than twice without diagnosing the root cause
