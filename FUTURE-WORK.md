# Plan: UX Improvements & Event Ownership

## Context

Post-MVP polish: the user identified 7 issues after reviewing the app — event editing, ownership enforcement, viewer counts, PDF bugs, and several small UX fixes. All changes target branch `claude/distribute-work-tasks-NlRKE`.

---

## Wave 1 — Quick fixes (no conflicts, do in parallel)

### 1A: Login redirect → /dashboard
**File:** `apps/web/src/pages/LoginPage.tsx` (line 19)
- Change `navigate('/create')` → `navigate('/dashboard')`

### 1B: Rename "Retry Transcript" button
**File:** `apps/web/src/pages/EventDetailPage.tsx` (lines 107-109)
- Change icon from `RotateCcw` to `Sparkles` (from lucide-react)
- Change text from `'Retry Transcript'` → `'AI: Tidy Up Transcript'`
- Change pending text from `'Retrying…'` → `'Processing…'`

### 1C: Sticky header on EventDetailPage
**File:** `apps/web/src/pages/EventDetailPage.tsx` (line 42)
- Add `sticky top-0 z-10` to header className

### 1D: Fix PDF text overflow
**File:** `apps/web/src/components/TranscriptDownload.tsx`
- Reduce content font size from 11 → 10 (line 83)
- Increase line height from 6 → 7 (line 93) for readability
- Increase margin from 20 → 25 (line 54) for more breathing room
- Use `doc.splitTextToSize()` with narrower `pageWidth` to prevent text from running off edges

---

## Wave 2 — Event ownership (backend + frontend, sequential)

### 2A: API — Set organiser_id on event creation
**File:** `apps/api/src/routes/events.ts`
- POST `/api/events` (line 25): Add `organiser_id: (req as any).user.id` to the insert object

### 2B: API — Add GET /api/events/mine endpoint
**File:** `apps/api/src/routes/events.ts`
- Add new JWT-protected endpoint `GET /api/events/mine`
- Query: `supabase.from('events').select('*').eq('organiser_id', (req as any).user.id).order('event_date', ...)`
- Keep existing `GET /api/events` public for the browse page

### 2C: API — Add ownership checks on mutations
**File:** `apps/api/src/routes/events.ts`
- PATCH `/:code/status`: Add ownership verification — fetch event, check `organiser_id === req.user.id`, return 403 if not owner
- POST `/:code/transcript/retry`: Same ownership check

### 2D: API — Add PATCH /api/events/:code for editing details
**File:** `apps/api/src/routes/events.ts`
- New JWT-protected endpoint `PATCH /api/events/:code`
- Accepts: `{ title?, description?, event_date?, phrase_list? }`
- Must verify ownership (organiser_id check)
- Only allow editing when status is `upcoming` (not live/ended)

### 2E: Shared types — Add organiser_id
**File:** `packages/shared/src/types.ts`
- Add `organiser_id?: string` to `Event` interface

### 2F: Dashboard — Use /mine endpoint
**File:** `apps/web/src/pages/DashboardPage.tsx` (line 16)
- Change `api.get<Event[]>('/api/events')` → `api.get<Event[]>('/api/events/mine')`

### 2G: EventDetailPage — Add inline edit mode
**File:** `apps/web/src/pages/EventDetailPage.tsx`
- Add `isEditing` state toggle
- Add pencil (Edit2) icon button next to "Event Details" heading (only when status is `upcoming`)
- When editing: show form fields (title input, description textarea, event_date datetime-local) pre-populated with current values
- Save button calls `PATCH /api/events/${event.code}` then invalidates query
- Cancel button exits edit mode
- Reuse `input-field`, `btn-primary`, `btn-secondary` CSS classes from existing form patterns

---

## Wave 3 — Viewer count (socket + frontend)

### 3A: Shared types — Add viewer:count event
**File:** `packages/shared/src/types.ts`
- Add to `ServerToClientEvents`: `'viewer:count': (payload: { count: number }) => void`

### 3B: SocketHandler — Broadcast viewer count
**File:** `apps/api/src/services/SocketHandler.ts`
- Create helper: `async function broadcastViewerCount(io: AppServer, code: string)` that calls `const sockets = await io.in(code).fetchSockets()` and emits `io.to(code).emit('viewer:count', { count: sockets.length })`
- Call it after `socket.join(code)` in `event:join` handler (line 22)
- Call it after `socket.leave(code)` in `event:leave` handler (line 64)
- Call it on `disconnect` — need to track which rooms a socket was in, or iterate socket.rooms before cleanup. Use a `socket.on('disconnecting', ...)` event (fires before rooms are cleared) to broadcast updated count for each room.

### 3C: Frontend — useViewerCount hook
**File:** `apps/web/src/hooks/useViewerCount.ts` (new)
- Listen for `viewer:count` socket event, return `count` number
- Accept `code` parameter to scope the listener

### 3D: Show viewer count on audience EventPage
**File:** `apps/web/src/pages/EventPage.tsx` (header, ~line 88)
- Import `useViewerCount` hook
- Show `Users` icon (lucide) + count next to connection status indicator

### 3E: Show viewer count on PresentPage
**File:** `apps/web/src/pages/PresentPage.tsx` (header, ~line 77)
- Import `useViewerCount` hook
- Show `Users` icon + count in header next to QR code

---

## Verification

1. `pnpm --filter @caption-aotearoa/shared build` — shared types compile
2. `pnpm --filter api test` — all 44+ API tests pass
3. `pnpm --filter web build` — web builds cleanly
4. Manual checks:
   - Login redirects to /dashboard
   - Dashboard only shows events created by logged-in user
   - EventDetailPage header sticks on scroll
   - Can edit event details (title, description, date) when status is upcoming
   - "AI: Tidy Up Transcript" button shows with Sparkles icon
   - Viewer count appears on both audience and presenter views
   - PDF downloads with proper margins (no text overflow)

---

## Files Modified (summary)

| File | Changes |
|------|---------|
| `packages/shared/src/types.ts` | Add `organiser_id` to Event, add `viewer:count` socket event |
| `apps/api/src/routes/events.ts` | Set organiser_id, add /mine, add PATCH details, ownership checks |
| `apps/api/src/services/SocketHandler.ts` | Broadcast viewer count on join/leave/disconnect |
| `apps/web/src/pages/LoginPage.tsx` | Redirect to /dashboard |
| `apps/web/src/pages/EventDetailPage.tsx` | Sticky header, edit mode, rename transcript button |
| `apps/web/src/pages/EventPage.tsx` | Show viewer count |
| `apps/web/src/pages/PresentPage.tsx` | Show viewer count |
| `apps/web/src/pages/DashboardPage.tsx` | Use /api/events/mine |
| `apps/web/src/components/TranscriptDownload.tsx` | Fix PDF margins/font size |
| `apps/web/src/hooks/useViewerCount.ts` | New hook for viewer count |
