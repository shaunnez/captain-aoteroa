# Contact Form — Engineering Specification

_Date: 2026-03-25 · v2 (post-review)_

---

## Constraints This Spec Must Respect

| Constraint | Source |
|------------|--------|
| `noUnusedLocals: true` in web tsconfig — unused imports are type errors | `apps/web/tsconfig.json` (enforced) |
| No backend changes — EmailJS is frontend-only | user decision |
| EmailJS credentials hard-coded (no env vars) — public key is intentionally client-visible | user decision |
| Framer-motion mocked globally in `src/__tests__/setup.tsx` — no per-file vi.mock | `apps/web/src/__tests__/setup.tsx` |
| Router uses `BrowserRouter` + `Routes` in `apps/web/src/router.tsx:1-53` | verified |
| Page pattern: header (logo + DarkModeToggle) + main + inline footer | `PrivacyPage.tsx`, `AccessibilityPage.tsx` |
| Form pattern: `useState` for fields + error + loading, no react-hook-form | `LoginPage.tsx:11-14` |
| Styling: Tailwind + CSS vars (`--color-primary`, `--color-on-surface`, etc.) | entire codebase |
| Lucide icons available | `apps/web/package.json` (`lucide-react: ^0.316.0`) |
| `emailjs.send()` is async; needs try/catch + loading state | EmailJS `@emailjs/browser` API |

**Dead `href="#"` links found across public pages (all fixed in WP4):**

| File | Line | Link text | Fix |
|------|------|-----------|-----|
| `apps/web/src/pages/HomePage.tsx` | 228 | Contact | → `/contact` |
| `apps/web/src/pages/PrivacyPage.tsx` | 190 | Accessibility | → `/accessibility` |
| `apps/web/src/pages/PrivacyPage.tsx` | 191 | Contact | → `/contact` |
| `apps/web/src/pages/AccessibilityPage.tsx` | 139 | Privacy | → `/privacy` |
| `apps/web/src/pages/AccessibilityPage.tsx` | 141 | Contact | → `/contact` |

Note: `HomePage.tsx:74` has `href="#contact"` — this is a nav anchor scroll link. Do NOT change it.

---

## Objective

Add a `/contact` page with a validated contact form that uses EmailJS to send messages directly to `uksn@me.com` from the browser — no backend required. Wire the existing placeholder `href="#"` Contact links in the footer of all three public pages to `/contact`. Also fix the other dead footer links (Privacy ↔ Accessibility cross-links) discovered during review.

---

## EmailJS Credentials (hard-coded)

| Key | Value |
|-----|-------|
| `SERVICE_ID` | `service_5cy3o0k` |
| `TEMPLATE_ID` | `template_gr0cbsa` |
| `PUBLIC_KEY` | `tDxf7rfkIWs8Cl8oN` |

The EmailJS template must be configured to send TO `uksn@me.com` using variables `{{from_name}}`, `{{from_email}}`, `{{message}}`.

---

## Acceptance Criteria

| AC | Description | Verify Command | Expected | Automated |
|----|-------------|----------------|----------|-----------|
| AC1 | `/contact` route exists and renders | `pnpm --filter web build` | Exit 0 | Yes |
| AC2 | Submitting empty form shows 3 validation errors | `pnpm --filter web test` | ContactPage tests pass | Yes |
| AC3 | Invalid email shows error | `pnpm --filter web test` | "Valid email required" error visible | Yes |
| AC4 | Valid submission calls `emailjs.send` with correct params | `pnpm --filter web test` | emailjs.send mock called with serviceId/templateId/payload | Yes |
| AC5 | Success state shows confirmation message | `pnpm --filter web test` | "Message sent" text appears | Yes |
| AC6 | Error state shows error message | `pnpm --filter web test` | "Failed to send" text appears | Yes |
| AC7 | All footer Contact links point to `/contact` | `grep -rn 'href="#">Contact' apps/web/src/pages/` | 0 lines | Yes |
| AC8 | Typecheck passes | `pnpm --filter web tsc --noEmit` | Exit 0 | Yes |
| AC9 | All web tests pass | `pnpm --filter web test` | All pass | Yes |

---

## Architecture

### Current Flow
- Footer Contact links: `href="#"` (dead) on HomePage, PrivacyPage, AccessibilityPage
- Footer cross-links between PrivacyPage and AccessibilityPage also dead (`href="#"`)
- No contact mechanism exists

### New Flow
1. User clicks Contact link in any footer → navigates to `/contact`
2. `ContactPage` renders form with Name, Email, Message fields
3. On submit: client-side validation (required + format checks)
4. If valid: `emailjs.send(SERVICE_ID, TEMPLATE_ID, { from_name, from_email, message }, PUBLIC_KEY)`
5. EmailJS delivers to `uksn@me.com` (configured in EmailJS dashboard template)
6. Success: form replaced with confirmation message
7. Error: inline error shown, form stays editable

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| EmailJS `@emailjs/browser` | No backend changes, free tier (200/month), simple API |
| Hard-coded credentials | Public key is intentionally client-visible in EmailJS model; domain-restrict in dashboard |
| Validation via `useState` | Matches existing codebase pattern (LoginPage) |
| Success replaces form | Prevents double-submit |
| Fix all dead `href="#"` footer links in WP4 | Discovered during review; same WP, no extra complexity |

---

## Interface Contracts

### EmailJS template params
```typescript
interface ContactTemplateParams {
  from_name: string    // user's name
  from_email: string   // user's email (reply-to)
  message: string      // message body
}
```

### Form validation errors
```typescript
interface FormErrors {
  name?: string
  email?: string
  message?: string
}
```

---

## Work Packages

### WP1 — Install @emailjs/browser

**File modified:** `apps/web/package.json` (via pnpm)

```bash
pnpm --filter web add @emailjs/browser
```

**Verify:** `grep "@emailjs/browser" apps/web/package.json` returns a version string.

---

### WP2 — Create ContactPage

**File to create:** `apps/web/src/pages/ContactPage.tsx`

Full implementation:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import { LogoImg } from '../components/LogoImg'
import { DarkModeToggle } from '../components/DarkModeToggle'

const SERVICE_ID  = 'service_5cy3o0k'
const TEMPLATE_ID = 'template_gr0cbsa'
const PUBLIC_KEY  = 'tDxf7rfkIWs8Cl8oN'

interface FormErrors { name?: string; email?: string; message?: string }

function validate(name: string, email: string, message: string): FormErrors {
  const errs: FormErrors = {}
  if (!name.trim() || name.trim().length < 2) errs.name = 'Name is required (min 2 characters)'
  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email address required'
  if (!message.trim() || message.trim().length < 10) errs.message = 'Message is required (min 10 characters)'
  return errs
}

export function ContactPage() {
  const navigate = useNavigate()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [message, setMessage]   = useState('')
  const [errors, setErrors]     = useState<FormErrors>({})
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [sendError, setSendError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSendError('')
    const errs = validate(name, email, message)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, { from_name: name, from_email: email, message }, PUBLIC_KEY)
      setSent(true)
    } catch {
      setSendError('Failed to send message. Please try again or email uksn@me.com directly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Nav */}
      <header className="sticky top-0 z-50 nav-glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <LogoImg className="h-9" />
            <span className="font-serif text-lg md:text-xl font-bold text-[var(--color-primary)]">
              HearMe NZ
            </span>
          </button>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 py-16 px-6">
        <div className="max-w-xl mx-auto">
          <h1 className="font-serif text-4xl font-bold text-[var(--color-primary)] mb-12">
            Contact
          </h1>

          {sent ? (
            <div role="alert" className="rounded-xl bg-[var(--color-surface-container)] p-8 text-center">
              <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)] mb-3">
                Message sent
              </h2>
              <p className="text-[var(--color-on-surface-variant)]">
                Thanks for getting in touch. We&apos;ll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                  Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-outline)] bg-[var(--color-surface-container)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                />
                {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
              </div>

              {sendError && (
                <p role="alert" className="text-red-500 text-sm">{sendError}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 rounded-lg bg-[var(--color-primary)] text-white font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
              >
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-[var(--color-outline-variant)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--color-on-surface-variant)]">
          <div className="flex items-center gap-2">
            <LogoImg className="h-7" />
            <span className="font-serif font-semibold text-[var(--color-primary)]">HearMe NZ</span>
          </div>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-[var(--color-primary)] transition-colors">Privacy</a>
            <a href="/accessibility" className="hover:text-[var(--color-primary)] transition-colors">Accessibility</a>
            <a href="/contact" className="hover:text-[var(--color-primary)] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
```


---

### WP3 — Add route to router

**File:** `apps/web/src/router.tsx`

**Change 1** — new import after line 13 (last import line `ProtectedRoute`):
```typescript
// line 13 — current last import:
import { ProtectedRoute } from './components/ProtectedRoute'
// add after:
import { ContactPage } from './pages/ContactPage'
```

**Change 2** — new route after `/privacy` route (currently line 38):
```tsx
<Route path="/privacy" element={<PrivacyPage />} />
// add after:
<Route path="/contact" element={<ContactPage />} />
```

---

### WP4 — Fix all dead `href="#"` footer links

All 5 changes across 3 files:

| File | Line | Current | New |
|------|------|---------|-----|
| `apps/web/src/pages/HomePage.tsx` | 228 | `href="#"` | `href="/contact"` |
| `apps/web/src/pages/PrivacyPage.tsx` | 190 | `href="#"` | `href="/accessibility"` |
| `apps/web/src/pages/PrivacyPage.tsx` | 191 | `href="#"` | `href="/contact"` |
| `apps/web/src/pages/AccessibilityPage.tsx` | 139 | `href="#"` | `href="/privacy"` |
| `apps/web/src/pages/AccessibilityPage.tsx` | 141 | `href="#"` | `href="/contact"` |

Do NOT change `HomePage.tsx:74` — that is `href="#contact"` (anchor scroll to footer), intentional.

---

### WP5 — Write ContactPage tests

**File to create:** `apps/web/src/__tests__/ContactPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
const mockSend = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@emailjs/browser', () => ({ default: { send: mockSend } }))
vi.mock('../components/DarkModeToggle', () => ({ DarkModeToggle: () => null }))
vi.mock('../components/LogoImg', () => ({ LogoImg: () => null }))

import { ContactPage } from '../pages/ContactPage'

function renderContactPage() {
  return render(<MemoryRouter><ContactPage /></MemoryRouter>)
}

describe('ContactPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows 3 validation errors when submitted empty', async () => {
    renderContactPage()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/valid email address required/i)).toBeInTheDocument()
    expect(screen.getByText(/message is required/i)).toBeInTheDocument()
  })

  it('shows email error for invalid email format', async () => {
    renderContactPage()
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hello this is a long enough message' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(screen.getByText(/valid email address required/i)).toBeInTheDocument()
  })

  it('calls emailjs.send with correct params on valid submission', async () => {
    mockSend.mockResolvedValue({})
    renderContactPage()
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hello this is a long enough message' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => expect(mockSend).toHaveBeenCalledOnce())
    expect(mockSend).toHaveBeenCalledWith(
      'service_5cy3o0k',
      expect.any(String),
      { from_name: 'Alice', from_email: 'alice@example.com', message: 'Hello this is a long enough message' },
      expect.any(String)
    )
  })

  it('shows success message after successful send', async () => {
    mockSend.mockResolvedValue({})
    renderContactPage()
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hello this is a long enough message' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => expect(screen.getByText(/message sent/i)).toBeInTheDocument())
  })

  it('shows error message when send fails', async () => {
    mockSend.mockRejectedValue(new Error('network error'))
    renderContactPage()
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Hello this is a long enough message' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/failed to send/i))
  })
})
```

---

## Execution Order

```
WP1 → WP2 → WP3 → WP4 → WP5
```

- **WP1 before WP2**: `@emailjs/browser` must be installed for TypeScript to resolve the import
- **WP2 before WP3**: ContactPage must exist before router imports it
- **WP3 and WP4 independent**: Can run in parallel; WP4 has no deps on any other WP
- **WP5 last**: Tests import ContactPage (needs WP2) and mock emailjs (needs WP1)

---

## Verification Strategy

### Tier 1 — Structural
```bash
ls apps/web/src/pages/ContactPage.tsx
grep "/contact" apps/web/src/router.tsx
grep -rn 'href="#">Contact' apps/web/src/pages/    # expect 0 lines
grep "@emailjs/browser" apps/web/package.json
```

### Tier 2 — Functional
```bash
pnpm --filter web tsc --noEmit
pnpm --filter web test
pnpm --filter web build
```

### Tier 3 — Regression
```bash
pnpm --filter api tsc --noEmit
pnpm --filter api test
pnpm --filter api build
```

---

## AC → Verification Map

| AC | Verify Command | Expected | Automated |
|----|----------------|----------|-----------|
| AC1 | `pnpm --filter web build` | Exit 0 | Yes |
| AC2–AC6 | `pnpm --filter web test` | ContactPage suite passes | Yes |
| AC7 | `grep -rn 'href="#">Contact' apps/web/src/pages/` | 0 lines | Yes |
| AC8 | `pnpm --filter web tsc --noEmit` | Exit 0 | Yes |
| AC9 | `pnpm --filter web test` | All pass | Yes |

---

## Risk Register

| Risk | Severity | Probability | Mitigation | Detection |
|------|----------|-------------|------------|-----------|
| EmailJS template not configured → sends but to wrong address | High | Medium | Verify in EmailJS dashboard; test end-to-end manually after deploy | Manual test |
| Hard-coded PUBLIC_KEY abused from another domain | Low | Low | Set domain restrictions in EmailJS dashboard | Operational |
| `noUnusedLocals` catches unused import in ContactPage | Low | Low | Only import what's used; verify with `tsc --noEmit` | AC8 |

---

## Review History

**v1 → v2 changes (based on adversarial review):**
- P0 fixed: AC7 grep command narrowed to `href="#">Contact` pattern (was matching all `href="#"`)
- P1 fixed: WP4 expanded to fix ALL dead footer links (PrivacyPage:190 Accessibility, AccessibilityPage:139 Privacy)
- Router import line corrected: insert after line 13 (ProtectedRoute), not line 12
- WP6 (env vars) removed: user chose hard-coded credentials
- TEMPLATE_ID and PUBLIC_KEY marked as pending (user to supply)
