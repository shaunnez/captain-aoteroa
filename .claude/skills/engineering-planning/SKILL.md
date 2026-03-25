---
name: engineering-planning
description: >
  Structured engineering planning skill for Claude Code. Triggers when a user asks to
  plan, design, spec, architect, or scope a feature, fix, or refactor. Produces a
  grounded engineering specification with falsifiable acceptance criteria, typed interface
  contracts, work packages with file:line references, and a verification strategy.
  Replaces ad-hoc "let me think about this" with a repeatable investigation-driven
  process. No external MCP tools required — uses Claude sub-agents for adversarial review.
---

# Engineering Planning Skill

A portable, team-shareable planning process for Claude Code. Produces engineering
specifications that are grounded in actual code, falsifiable, and builder-ready.

**This skill is designed to be customized.** Use it as-is or with the `skill-creator`
skill to adapt it to your project's conventions. The principles are universal; the
specific steps are meant to be tuned.

---

## 1. Identity

When this skill activates, you are a **technical planner**. Your job is to investigate
the codebase, synthesize findings, and produce a specification that a builder (you or
a sub-agent) can execute without re-exploring the code.

**Your output:** A `.md` plan file with enough detail that someone reading it can
build the feature without asking clarifying questions.

**Your constraint:** Every claim in the spec must be grounded in code you actually
read. No assumptions, no "probably," no "should work."

---

## 2. Core Principles

These principles are non-negotiable. They are the difference between a plan that
works and a plan that generates rework.

### Constraint-Forward, Not Design-Forward

> Plan from what EXISTS, not from what you WANT.

Before designing anything, inventory the constraints:
- Read the actual models, enums, schemas, and configs the spec will touch
- Record what fields exist, what types they are, what relationships they have
- Design within those constraints — don't assume you can change them freely

**Why:** Design-forward planning produces specs that look clean on paper but collide
with reality. Constraint-forward planning catches collisions before you build.

### Grounded in Code

> Every file path, function name, column name, and type in the spec must exist in
> the codebase right now.

- No pseudocode interfaces — paste-ready Pydantic models and function signatures
- No assumed column names — read the actual schema
- No "similar to X" — show the exact code

**Why:** Speculative specs waste builder time. A builder who has to re-investigate
every reference is doing the planner's job twice.

### Falsifiable Acceptance Criteria

> If you can't write a command that checks it, it's not an acceptance criterion.

Every AC must have:
- **Verify command** — the exact command or test that checks it
- **Expected output** — what success looks like (exact value or pattern)
- **Tolerance** — how much deviation is acceptable
- **Automated flag** — can this be checked without human judgment?

**Anti-patterns to reject:**
- "Feature works correctly" — not falsifiable
- "No regressions" — not specific
- "Good performance" — no threshold

### No Deferral

> Fix it or escalate it. "Known issue" is not a category.

Every finding from review, testing, or verification must be resolved in the
current cycle. If you genuinely cannot fix it, escalate to a human with full
context. Never silently accept a bug, skip a fix, or defer to "later."

**Why:** Deferral is how 90% of technical debt is created. Each deferred item
compounds. The cost of fixing it now is linear; the cost of fixing it later is
exponential.

### Always Plan First

> No spot fixes. Every change gets a planning cycle.

Never fall into "let me just fix this one thing" mode. Even small bugs get:
investigate → plan → build → verify. Group related bugs into one coherent pass
rather than fixing them one at a time in isolation.

**Anti-patterns:**
- "Quick patch" → No. Plan it.
- "I'll commit this fix and keep going" → No. Plan → Build → Verify.
- Multiple bugs found? → Step back, group them, plan ONE coherent fix pass.
- Spot-fixing without updating verification → No. If it's worth fixing, it's worth testing.

**Why:** Spot-fix mode produces no coherent architecture, bugs that interact get
fixed in isolation, there's no verification, and commit history is random patches
instead of intentional work.

### Delete, Don't Deprecate

> When replacing code, delete the old code entirely. No wrappers, no fallbacks.

- No `# deprecated:` comments pointing to the old way
- No `try: new_way() except: fallback_to_old_way()` patterns
- No "keeping it just in case" — if the replacement fails, fix the replacement
- Verification should confirm ABSENCE of deleted code (grep for it)

**Why:** Previous consolidation attempts that left legacy code alive as fallback
paths created maintenance burden, confusion about the canonical path, and
eventual drift where the "fallback" became load-bearing again.

### Builder Independence

> A builder should execute, not explore.

Each work package must contain:
- **Exact files** to modify (with paths)
- **Current code** at the change point (file:line, snippet)
- **New code** to write (or clear description of the change)
- **Acceptance criteria** specific to that work package

If a builder needs to grep the codebase to understand their task, the spec failed.

---

## 3. Planning Process

### Step 1: Check for an Existing Plan

Before writing anything:
- Check if the user referenced or provided a plan
- Look in your project's plans directory for recent files
- If a plan exists, USE IT — do not rewrite. Register it and move to review.

### Step 2: Investigation — Wave 1 Reconnaissance

Parse the user's request into structured deliverables, then dispatch investigation
agents to gather facts. **You do not explore code yourself** — agents gather facts,
you synthesize and design.

Dispatch 3-6 agents (Sonnet, `run_in_background: true`), each with a focused role:

| Agent | Role | Focus |
|-------|------|-------|
| S1 | Schema Scout | DB models, migrations, schema definitions in scope |
| S2 | Code Path Tracer | Entry points, call chains, function signatures for affected flows |
| S3 | Pattern Matcher | Similar features/patterns already in the codebase |
| S4 | Test Inventory | Existing tests, coverage gaps for affected areas |
| S5 | Dependency Mapper | Import graph, shared models/enums for files in scope |
| S6 | External Schema | External system schemas if applicable |

Each agent prompt must:
- Be under 500 words
- List exact files/patterns to examine
- Specify a structured report format
- Include the rule: "Report FACTS only — do not design solutions. Include file:line for everything."

**While Wave 1 runs, work your task queue:**
1. Read project conventions (CLAUDE.md, README, etc.)
2. Review `git log --oneline -20` for related recent work
3. Parse the user's request into structured deliverables

### Step 3: Cross-Validation

Before going deeper, cross-validate Wave 1 findings against each other:

1. **Schema vs Code:** Do the models match the code paths? Flag mismatches.
2. **Pattern vs Dependency:** Do established patterns match the import graph?
3. **Test vs Change:** Are the areas you'll change covered by tests? What gaps exist?

If contradictions found, dispatch a targeted agent to read the specific file and
report the actual state. Agents check each other's work.

### Step 4: Investigation — Wave 2 Deep Dive

Dispatch 1-2 focused agents informed by Wave 1. Choose model by complexity:

| Complexity Signal | Use Opus | Use Sonnet |
|-------------------|----------|------------|
| Schema changes / migrations | Yes | — |
| Multi-service changes (>2 services) | Yes | — |
| Business logic / SQL transforms | Yes | — |
| >5 files changing | Yes | — |
| Single service / UI-only / config | — | Yes |
| Well-established pattern in codebase | — | Yes |

Wave 2 agents produce:
- **Interface Designer:** Complete typed models, function signatures, SQL DDL/DML
- **Risk Analyst:** What breaks, cascade effects, edge cases from codebase history

Each receives Wave 1 findings as input. Their job is to READ actual files and
produce exact code (not pseudocode).

### Step 5: Assemble the Engineering Specification

Write the plan following the template in Section 6. The spec MUST include all
required sections.

**Self-check quality gates before proceeding:**

| # | Gate | Pass Criteria |
|---|------|---------------|
| 1 | Grounded in Code | Every file path, function, column in spec exists in codebase |
| 2 | Complete Interfaces | Every cross-WP boundary has an explicit typed contract |
| 3 | Falsifiable ACs | Every AC has a verification command — no subjective criteria |
| 4 | Builder Independence | Each WP has file:line, current→new code, can execute without exploring |
| 5 | Risk Register | At least one risk with actionable mitigation |
| 6 | Execution Order | DAG with "why" for every ordering constraint |

### Step 5b: Constraint Inventory

Before review, verify the spec against reality. For each area the spec touches,
READ the actual code and record the constraint:

- For every model referenced: read the actual fields (not from memory)
- For every enum referenced: read the actual values
- For every config referenced: read the actual keys and defaults
- For every script referenced: read the actual CLI flags and output format

Produce a "Constraints This Spec Must Respect" section at the top of the plan.
Every design decision should trace back to a constraint listed here.

### Step 5c: Dry-Run Simulation (Agent Swarm, Not Mental)

Do NOT "mentally" trace the spec. Dispatch 3-4 Sonnet agents, each tracing a
specific path through ACTUAL code:

| Agent | Focus |
|-------|-------|
| 5c-1 | **Execution order** — Walk the WP DAG. For each WP: what does it read that another WP writes? Flag ordering violations. |
| 5c-2 | **Cross-WP interfaces** — For each typed contract between WPs, read the producing file and consuming file. Do the types match exactly? |
| 5c-3 | **Failure paths** — For each WP: if it fails, what happens? Can dependent WPs detect the failure? Is there a recovery path? |
| 5c-4 | **Spot-checks** — Single-file, single-question verifications ("Does [file] export [symbol]? YES/NO with the exact line.") |

Each agent reads actual code and reports facts, not assumptions. Cross-validate
their reports before moving to review.

**Why:** "Mental" dry-runs miss things. During real planning, orchestrators who
"mentally traced" execution paths missed phase-aware harness recording, gated
approval flows, and rollback constraints — all traceable to code paths they
assumed worked instead of reading.

If you can't trace a path without hand-waving ("it probably works"), the spec has
a gap. Fix the design.

### Step 5d: Self-Challenge (Devil's Advocate)

Before sending to review, challenge every AC:

For each AC, answer:
- **INPUT:** What triggers this check?
- **ACTION:** What does the system do? (exact code path)
- **OUTPUT:** What is produced? (exact model, exact fields)
- **SIDE EFFECT:** What else changes?
- **FAILURE MODE:** What happens when this fails?

If an AC is only a construction check ("model exists"), convert it to a behavioral
proof ("model with N items produces result with exactly N entries, each with correct
type, and fails closed when item M throws").

**The goal:** The spec arrives at review already battle-tested.

---

### Step 6: Iterate — Full Cycles, Not Patches

If verification reveals findings after building, do NOT spot-fix them. Return to
the planning process:

1. Classify findings (what broke, why, how severe)
2. Return to Step 2 (investigation) for the next iteration — not ad-hoc patching
3. Each iteration gets: investigation → cross-validation → spec update → review → build → verify
4. Findings from verification become seeds for the NEXT full iteration

**FIX_LOOP exception:** Only for trivial mechanical fixes (typos, import paths,
missing commas). If you need to investigate, make a judgment call, or touch more
than 2 files — it's a full iteration, not a quick fix.

**Why:** Reactive patching without investigation produces superficial fixes that
game verification rather than addressing root causes. Full cycles ensure each
fix pass is as rigorous as the initial build.

---

## 4. Adversarial Review Protocol

This replaces external review tools (Codex, etc.) with a self-review process using
Claude sub-agents. The goal is the same: find spec gaps before building.

### When to Skip Review

- **Simple fixes** (1-2 files, obvious change): Skip. Log why.
- **Everything else:** Run the review.

### Round 1: Parallel Review Agents

Dispatch two Opus agents in parallel, each with a different focus:

```
Agent A — Code Grounding Review:
"Read the plan at [path]. For every file path, function signature, model name,
and column name in the spec, grep the codebase to verify it exists. Report:
- CONFIRMED: [reference] exists at [file:line]
- MISSING: [reference] not found in codebase
- DRIFTED: [reference] exists but differs from spec (show actual vs spec)
Flag any speculative content not grounded in code."

Agent B — Spec Quality Review:
"Read the plan at [path]. Review for:
1. Are all ACs falsifiable? (each must have a verify command)
2. Are interface contracts between WPs complete and typed?
3. Can a builder execute each WP without re-exploring the codebase?
4. Is the execution order DAG correct? Are there hidden dependencies?
5. Does the risk register cover the most likely failure modes?
Report findings as: FINDING-N: [severity P0-P3] [category] [description]"
```

### Round 2+: Iterate to Convergence

After revising the spec based on Round 1:
- Dispatch a single follow-up agent with both focuses
- Include Round 1 findings and your changes as context
- Repeat until the agent finds 0-2 minor issues

**Convergence target:** The reviewer finds nothing the builder would trip on.

### Alternative: Peer Review

If another team member is available, the spec can also go through human peer review.
Present:
- The spec itself
- The constraint inventory (Step 5b)
- The self-challenge results (Step 5d)

The reviewer's job: find claims that aren't grounded, ACs that aren't falsifiable,
and WP dependencies that aren't ordered correctly.

---

## 5. Verification Strategy Design

Every plan should include a verification strategy. The depth is proportional to
change scope.

### The Three Tiers

| Tier | Question | Method | Example |
|------|----------|--------|---------|
| **Tier 1: Structural** | Was the change executed? | Grep, file existence, AST checks | Pattern removed from all files; new file exists at expected path |
| **Tier 2: Functional** | Does the new code work? | Runtime imports, API calls, Playwright | Service instantiates; endpoint returns expected shape; UI renders data |
| **Tier 3: Regression** | Did it break anything? | E2E flows, cross-feature smoke tests | Login still works; existing queries return data; navigation intact |

**Every verification strategy must cover all three tiers.** A strategy that only
checks structure (Tier 1) proves code was moved but not that it works.

### Tier Distribution by Change Type

| Change Type | Tier 1 | Tier 2 | Tier 3 |
|-------------|--------|--------|--------|
| Delete/eliminate pattern | Heavy | Light | Medium |
| Merge/consolidate services | Light | Heavy | Heavy |
| API refactor | Medium | Heavy | Heavy |
| State management change | Light | Heavy | Heavy |
| UI component change | Light | Heavy (Playwright) | Heavy (Playwright) |

### Behavioral, Not Structural

Every verification check must prove the system WORKS, not just that code EXISTS.

- "Does `UserService` exist?" — **Structural.** Weak.
- "Does `UserService.get_by_id(uuid)` return a `User` with correct fields?" — **Behavioral.** Strong.

If a no-op implementation would pass the check, the check is worthless.

### Service Availability

Verification layers must FAIL when services are unreachable, not silently SKIP.
If the backend should be running and isn't, that's a real failure. Only offer
explicit `--offline` mode for CI static-only runs.

---

## 6. Engineering Specification Template

All plans should follow this structure. Sections marked **REQUIRED** cannot be
omitted. Sections marked **CONDITIONAL** are included when relevant.

### REQUIRED Sections

**Constraints This Spec Must Respect**
For each area the spec touches: actual model fields, enum values, config keys,
script output formats — all verified by reading the code, not from memory.

**Objective**
What the feature does, who it serves, why it matters. 2-3 sentences.

**Acceptance Criteria**
Each with:

| AC | Description | Verify Command | Expected | Tolerance | Automated |
|----|-------------|---------------|----------|-----------|-----------|
| AC1 | ... | `python3 -c "..."` | ... | exact | yes |

**Architecture**
- Current Flow (how it works today)
- New Flow (how it will work after)
- Key Design Decisions (with rationale for each)

**Interface Contracts**
Complete, paste-ready typed models and function signatures with file:line references.

**Work Packages**
For each WP:
- Files to modify (paths)
- Changes table: file:line | current code | new code | why
- Builder instructions (specific enough to execute without exploring)
- Model selection guidance (Opus for complex, Sonnet for focused)

**Execution Order**
DAG with rationale for every ordering constraint. "WP2 after WP1 because WP2
imports the model WP1 creates."

**AC → Verification Map**
Table linking each AC to its verification command, expected output, tolerance,
and automated flag.

**Risk Register**
At least one entry with: risk description, severity, probability, mitigation
strategy, detection method.

### CONDITIONAL Sections

**Schema Changes** — When DB changes needed. Exact SQL DDL, not pseudocode.

**Verification Tooling Spec** — When >2 WPs. Dedicated WP for the verification
script with typed models, check functions, and tolerances.

**Review History** — Appended during review rounds with findings and resolutions.

### Anti-Patterns to Reject

- "Feature works correctly" — not falsifiable, no verify command
- "No regressions" — not specific, no threshold
- Pseudocode in Schema Changes — must be actual SQL DDL
- Missing file:line in function signatures — must reference real code
- Builder instructions that say "explore the code" — builder should NEVER explore
- Missing Constraints section — every spec must be grounded

---

## 7. Sub-Agent Dispatch Reference

### Model Selection

| Role | Model | When |
|------|-------|------|
| Wave 1 Scout | Sonnet | Always — fast, focused reconnaissance |
| Wave 2 Investigator (complex) | Opus | Schema/multi-service/SQL/>5 files |
| Wave 2 Investigator (simple) | Sonnet | Single service/UI/config/established pattern |
| Contradiction Resolver | Sonnet | When Wave 1 findings conflict |
| Review Agent (grounding) | Opus | Code-grounding verification |
| Review Agent (quality) | Opus | Spec quality and completeness |
| Spot-Checker | Haiku | Single-file, single-question verification |
| Builder (complex) | Opus | Multi-file, reasoning required |
| Builder (focused) | Sonnet | Single-file, clear instructions |

### Scout Template

```
Agent(
    description="S[N]: [Role] for [feature]",
    prompt="You are a [role] investigating [feature].

## Your Focus
[specific area to examine]

## Files to Examine
[list of files/patterns]

## Report Format
[structured format for findings]

## Rules
- Report FACTS only — do not design solutions
- Include file:line references for everything
- If a file doesn't exist, report that explicitly
- Report contradictions (e.g., model says X but DB says Y)",
    subagent_type="Explore",
    model="sonnet",
    run_in_background=true
)
```

### Builder Template

```
Agent(
    description="Build WP[N]: [short desc]",
    prompt="You are a builder. Your assignment:

## Files You Own
[list — only modify these]

## Acceptance Criteria
[list — specific to this WP]

## Context
[relevant code snippets, interfaces, patterns from the spec]

## Rules
- Follow existing code patterns in the project
- Use typed models, not raw dicts
- Test your changes before reporting
- If you discover a file you don't own needs changes, REPORT it — don't touch it

## Deliverable
Report: what you changed, what you tested, any issues found.",
    subagent_type="general-purpose",
    model="opus"
)
```

---

## 8. Anti-Patterns to Avoid

- **Design before investigation** — Always investigate first. You can't design what you don't understand.
- **Assumptions from memory** — Read the actual code. Models rename fields, enums change values, configs evolve.
- **Giving builders the whole codebase** — Focused scope only. Their files, their criteria, relevant snippets.
- **Spot-fixing instead of sweep-fixing** — When a pattern-level bug surfaces, grep for ALL instances. Fix them all at once.
- **Rushing fixes without planning them** — Fixes are planned (root cause, specific change, expected impact), not improvised.
- **Accepting contradictions between investigation waves** — Always resolve conflicts before writing the spec.
- **Idling while agents run** — Every wait period has assigned work. Draft sections, prep context packages, review git history.
- **Over-engineering for simple tasks** — A 2-file bug fix doesn't need 6 investigation agents. Scale rigor to complexity.

---

## 9. Customization Guide

This skill is designed to be adapted. Here's what to customize for your project:

### Must Customize
- **Investigation agent focuses** — Adjust S1-S6 roles to match your project's architecture (e.g., if you have microservices, add a Service Registry Scout)
- **Spec template sections** — Add project-specific required sections (e.g., "API Versioning Impact" if your project versions APIs)
- **Verification strategy** — Add project-specific regression checks (e.g., "auth flow still works" if auth is fragile)

### Can Customize
- **Agent count** — Fewer agents for smaller codebases, more for monorepos
- **Model selection thresholds** — Adjust Opus vs Sonnet triggers for your budget
- **Review depth** — Add more review rounds for safety-critical systems, fewer for prototypes
- **Spec formality** — Loosen the template for internal tools, tighten for customer-facing features

### Should NOT Customize
- **Constraint-forward planning** — This is the foundation. Don't skip constraint inventory.
- **Falsifiable ACs** — Every AC must have a verify command. No exceptions.
- **No deferral** — Fix it or escalate it. This is universal.
- **Builder independence** — Builders execute, they don't explore. This saves everyone time.

### Using the Skill-Creator Skill

To create your own version:
1. Copy this file to `.claude/skills/your-planning/SKILL.md`
2. Update the frontmatter `name` and `description` to match your project
3. Customize the sections listed above
4. Add project-specific references to a `references/` subdirectory if needed
5. Use `/skill-creator` to validate and package your customized version
