# Caption Aotearoa

Live captioning web app for NZ community events. Streams audio to Azure Speech-to-text, translates captions into NZ census languages, and broadcasts to audience phones — no app install needed.

## Monorepo structure

pnpm workspace with two apps and one shared package:

- `apps/api` — Express + Socket.IO backend. Handles WebSocket sessions, Azure Speech and Translator integration, event management.
- `apps/web` — React frontend. Organiser dashboard (create/manage events), presenter view (mic capture), and audience view (live captions + language picker).
- `packages/shared` — Types and constants shared between api and web (e.g. `NZ_LANGUAGES`, `Event` interface).

## Dev

```bash
pnpm install          # install all workspaces
pnpm --filter api dev
pnpm --filter web dev
```

## No worktrees

Do not use git worktrees on this project.
