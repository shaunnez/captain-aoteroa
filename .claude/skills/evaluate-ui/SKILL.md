---
name: evaluate-ui
description: >
  Playwright-based UI evaluation for frontend changes. Navigates to affected pages,
  takes screenshots, checks interactive elements, grades against project design criteria.
  Trigger: /evaluate-ui, "check the UI", "test the frontend", "screenshot the page"
---

# Evaluate UI

Use Playwright MCP to evaluate frontend changes by actually interacting with the
running app — not just reading code.

## When to Use

- After any WP that modifies `apps/web` components
- After CSS/styling changes
- After new pages or routes are added
- When the harness evaluator needs frontend verification
- Before declaring any UI work complete

## Prerequisites

- Web dev server running: `pnpm --filter web dev` (default: http://localhost:5173)
- API dev server running if pages need data: `pnpm --filter api dev`
- Playwright MCP available

## Procedure

### Step 1: Identify Pages to Check

From the WP or change list, determine which routes are affected:

| Page | Route | What to Check |
|------|-------|---------------|
| Dashboard | `/` | Event list, create button, navigation |
| Present | `/present/:code` | Mic controls, language selector, status |
| Event/Audience | `/event/:code` | Caption display, language picker, live updates |
| Admin | `/admin` | Event management, settings |

### Step 2: Navigate and Snapshot

For each affected page:

1. Use `browser_navigate` to load the page
2. Use `browser_snapshot` to capture the accessibility tree
3. Use `browser_take_screenshot` for visual check
4. Read the snapshot for structural correctness

### Step 3: Interaction Checks

For each interactive element on affected pages:

1. Use `browser_click` on buttons, links, dropdowns
2. Use `browser_fill_form` for input fields
3. Use `browser_select_option` for language pickers
4. Verify state changes after interactions (re-snapshot)

### Step 4: Grade Against Criteria

Score each page on these project-specific criteria:

**Brand Consistency**
- Primary purple `#493276` used for key UI elements
- Sand background `#fdfdf0` where appropriate
- CSS var `--color-primary` used (not hardcoded values)
- No generic blue/gray default styling leaked through

**Accessibility**
- All interactive elements have accessible names (check snapshot tree)
- Color contrast meets WCAG AA (4.5:1 for text)
- Language picker is keyboard-navigable
- Live captions region has appropriate ARIA live attributes

**Responsiveness**
- Use `browser_resize` to check at 375px (mobile), 768px (tablet), 1024px (desktop)
- No horizontal overflow at mobile widths
- Touch targets at least 44x44px on mobile

**Functionality**
- Language picker shows NZ census languages
- Caption display area renders text correctly
- Navigation between views works
- Loading/error states display appropriately

### Step 5: Report

Write evaluation to a structured format:

```markdown
## UI Evaluation: [WP/Feature Name]

### Pages Checked
- [route]: [PASS/FAIL] — [notes]

### Brand Consistency: [PASS/PARTIAL/FAIL]
- [findings]

### Accessibility: [PASS/PARTIAL/FAIL]
- [findings]

### Responsiveness: [PASS/PARTIAL/FAIL]
- [findings]

### Functionality: [PASS/PARTIAL/FAIL]
- [findings]

### Screenshots
[Reference any screenshots taken]

### Issues Found
1. [severity] [description] [file:line if identifiable]
```

## Grading Thresholds

- **Brand Consistency**: Any non-brand color in primary UI = FAIL
- **Accessibility**: Missing accessible name on interactive element = FAIL
- **Responsiveness**: Horizontal overflow at 375px = FAIL
- **Functionality**: Broken navigation or non-rendering content = FAIL

ALL categories must PASS before declaring frontend work complete.

## What NOT to Do

- Do not evaluate by reading JSX alone — you must render and interact
- Do not skip mobile check — Caption Aotearoa is primarily used on phones
- Do not assume Playwright MCP failures mean the code is wrong — check if dev server is running first
- Do not grade "looks fine" — use the specific criteria above
