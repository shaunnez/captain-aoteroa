---
name: harness
description: >
  Long-running generator-evaluator harness for multi-WP feature execution.
  Separates generation from evaluation with per-WP context resets and structured
  handoffs. Inspired by GAN-style adversarial architecture.
  Trigger: /harness, "run the harness", "execute with harness", "long-running build"
---

# Generator-Evaluator Harness

Execute multi-WP plans with separated generation and evaluation agents, per-WP
context resets, and structured handoff artifacts. Prevents context degradation
and self-evaluation bias on long-running tasks.

## When to Use

- Plan has 3+ Work Packages
- Feature touches both api and web
- Estimated session would exceed ~60% of context window
- Any full-stack feature (STT → translate → TTS → broadcast path)

For 1-2 WP plans, just execute directly — this harness adds overhead.

## Prerequisites

- A completed engineering plan exists (via `/engineering-planning` or manual)
- Plan has defined WPs with file lists, acceptance criteria, and execution order
- Dev servers can be started (`pnpm --filter api dev`, `pnpm --filter web dev`)

## Core Principle: Separate Generation from Evaluation

The generator and evaluator are NEVER the same session. This is not optional.
Self-evaluation produces confident praise of mediocre output. External evaluation
catches real issues.

---

## Procedure

### Step 1: Load and Validate Plan

Read the plan file. Verify:
- [ ] Every WP has specific files to modify
- [ ] Every WP has falsifiable acceptance criteria with verify commands
- [ ] Execution order DAG is defined
- [ ] No WP requires more than ~10 files changed (split if so)

If the plan is missing any of these, stop and fix the plan first.

### Step 2: Create Sprint Contracts

Before dispatching any generator, create a sprint contract for each WP.
Sprint contracts are implementation-level (more specific than plan ACs):

```markdown
## Sprint Contract: WP-N

### Success Criteria (generator must meet ALL)
- [ ] `pnpm --filter [app] tsc --noEmit` passes
- [ ] `pnpm --filter [app] test` passes
- [ ] [Specific behavioral check, e.g. "GET /api/events/:id returns new field"]
- [ ] No `as any` without explanatory comment
- [ ] Only files listed in WP are modified

### Failure Criteria (evaluator flags ANY)
- Type errors introduced
- Existing tests broken
- Files outside WP scope modified
- Acceptance criteria not met by verify commands
```

Write contracts to `docs/superpowers/contracts/WP-N-contract.md`.

### Step 3: Execute WPs with Context Resets

For each WP in execution order:

**3a. Dispatch Generator Agent**

```
Agent(
  description="Build WP-N: [short desc]",
  prompt="You are a builder for Caption Aotearoa.

## Your Assignment
[Paste WP-N from plan]

## Sprint Contract
[Paste WP-N contract]

## Context from Prior WPs
[Paste WP-(N-1)-RESULT.md if exists]

## Rules
- ONLY modify files listed in your WP
- Follow existing code patterns (check adjacent files)
- Run typecheck after changes: pnpm --filter [app] tsc --noEmit
- Run tests after changes: pnpm --filter [app] test
- If you discover a file outside your scope needs changes, REPORT it — don't touch it
- Write your results to docs/superpowers/contracts/WP-N-result.md

## Result Format
Report: files changed, tests run, verify command outputs, any issues found.",
  subagent_type="general-purpose"
)
```

**3b. Dispatch Evaluator Agent (separate session)**

After the generator completes, dispatch a FRESH evaluator:

```
Agent(
  description="Evaluate WP-N: [short desc]",
  prompt="You are an evaluator for Caption Aotearoa. Your job is to find
problems, not confirm success. Be skeptical.

## Sprint Contract
[Paste WP-N contract]

## Generator's Claimed Results
[Paste WP-N-result.md]

## Your Checks
1. Run every verify command from the sprint contract. Record exact output.
2. Read every file the generator claims to have modified. Verify changes match the plan.
3. Run full typecheck: pnpm --filter api tsc --noEmit && pnpm --filter web tsc --noEmit
4. Run full tests: pnpm --filter api test && pnpm --filter web test
5. Check for regressions: any files adjacent to changed files that might break.
6. If frontend changes: use Playwright to navigate to affected pages and verify.

## Grading
For each sprint contract criterion, grade:
- PASS: verify command produces expected output
- FAIL: verify command fails or produces wrong output
- PARTIAL: works but with caveats (explain)

## Threshold
ALL criteria must PASS. Any FAIL triggers a feedback loop.

Write evaluation to docs/superpowers/contracts/WP-N-eval.md",
  subagent_type="general-purpose"
)
```

**3c. Feedback Loop (if evaluation fails)**

If evaluator returns any FAIL:
1. Read the eval report
2. Dispatch a NEW generator agent with:
   - The original WP spec
   - The evaluator's specific failure findings
   - The instruction: "Fix ONLY the failures identified. Do not re-do passing work."
3. Re-evaluate with a NEW evaluator agent
4. Max 3 feedback loops per WP. If still failing after 3, escalate to user.

**3d. Write Handoff Artifact**

After WP passes evaluation, consolidate into `docs/superpowers/contracts/WP-N-handoff.md`:

```markdown
## WP-N Handoff

### Completed
- [list of changes with file:line]

### Verified
- [list of verify commands and their outputs]

### Interface Changes
- [any new exports, types, or API endpoints the next WP needs to know about]

### Surprises
- [anything unexpected discovered during build]
```

This handoff is the ONLY context the next WP's generator receives about prior work.

### Step 4: Final Verification

After all WPs complete:

```bash
pnpm --filter api tsc --noEmit
pnpm --filter web tsc --noEmit
pnpm --filter api test
pnpm --filter web test
pnpm --filter api build
pnpm --filter web build
```

If integration tests are relevant:
```bash
pnpm test:integration
```

### Step 5: Cleanup

- Consolidate WP handoffs into a single summary
- Delete individual contract/result/eval files (or archive to `docs/superpowers/archive/`)
- Update memory if you learned something reusable

---

## Context Reset Rules

These are non-negotiable:

1. **Each WP generator gets a fresh agent.** No accumulated context from prior WPs.
2. **Each evaluator gets a fresh agent.** Never the same session as the generator.
3. **Handoff artifacts are the only bridge** between WPs. No "I remember from earlier."
4. **If a session approaches context limits**, stop the current WP, write a partial handoff, and restart with a fresh agent.
5. **Never let a generator evaluate its own work.** Not even "let me just quickly check."

## Scaling Rigor

| Plan Size | Generator | Evaluator | Contracts |
|-----------|-----------|-----------|-----------|
| 1-2 WPs | Execute directly, no harness | Run /verify | Skip |
| 3-4 WPs | Per-WP agents | Per-WP agents | Lightweight |
| 5+ WPs | Per-WP agents with handoffs | Per-WP agents + Playwright | Full contracts |
| Full-stack feature | Per-WP agents | Per-WP + integration test eval | Full + integration |

## What NOT to Do

- Do not let the generator self-evaluate ("looks good to me" is worthless)
- Do not skip evaluator for "simple" WPs in a multi-WP plan — bias is strongest when you think it's easy
- Do not accumulate context across WPs — fresh agents prevent degradation
- Do not run more than 3 feedback loops — escalate to user instead
- Do not skip sprint contracts — they're what makes evaluation objective
