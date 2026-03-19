# Caption Aotearoa MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working live captioning web app tested with a Deaf pilot user, ready for the Access Activator $100k grant application by 2026-03-29.

**Architecture:** pnpm monorepo with Vite+React frontend and Node.js+Express+Socket.io backend. Raw PCM audio is captured via Web Audio API (AudioWorkletNode), streamed to the server as ArrayBuffer over Socket.io, pushed into Azure Cognitive Services TranslationRecognizer via PushAudioInputStream, and broadcast as caption segments to all audience devices in real time. Events and final caption segments persist to Supabase Postgres.

**Tech Stack:** pnpm workspaces · Vite 5 · React 18 · TypeScript 5 · Tailwind CSS 3 · TanStack Query 5 · Axios · Socket.io-client 4 · react-qr-code · Node.js 20 · Express 4 · Socket.io 4 · microsoft-cognitiveservices-speech-sdk · jsonwebtoken · @supabase/supabase-js 2 · Vitest · Supertest

---

## File Map

```
/                               ← repo root
├── package.json                ← pnpm workspace root
├── pnpm-workspace.yaml
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── types.ts        ← Event, CaptionSegment, all Socket.io event payloads
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── src/
│   │       ├── index.ts        ← Express app + Socket.io + server start
│   │       ├── config.ts       ← env var loading + validation
│   │       ├── middleware/
│   │       │   └── auth.ts     ← verifyJWT Express middleware
│   │       ├── routes/
│   │       │   ├── auth.ts     ← POST /api/auth/login
│   │       │   └── events.ts   ← POST /api/events, GET /api/events/:code, PATCH /api/events/:code/status
│   │       ├── services/
│   │       │   ├── supabase.ts     ← Supabase service-role client
│   │       │   ├── AzureSession.ts ← TranslationRecognizer + PushAudioInputStream per event
│   │       │   ├── EventManager.ts ← Map<code, AzureSession> lifecycle
│   │       │   └── SocketHandler.ts← Socket.io room logic + audio routing
│   │       └── __tests__/
│   │           ├── auth.test.ts
│   │           ├── events.test.ts
│   │           ├── AzureSession.test.ts
│   │           └── EventManager.test.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── index.html
│       ├── public/
│       │   └── audio-processor.js  ← AudioWorklet (plain JS, served as static)
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── router.tsx
│           ├── lib/
│           │   ├── api.ts          ← Axios instance with JWT Authorization header
│           │   └── socket.ts       ← Socket.io client singleton
│           ├── hooks/
│           │   ├── useAuth.ts      ← JWT read/write/clear from localStorage
│           │   ├── useAudioCapture.ts ← AudioWorklet → PCM → socket emit
│           │   └── useCaptions.ts  ← socket events → caption segment state
│           ├── components/
│           │   ├── ProtectedRoute.tsx  ← redirects to /organiser-login if no JWT
│           │   ├── CaptionDisplay.tsx  ← scrolling live text, interim/final styles
│           │   ├── MicControl.tsx      ← start/stop recording button + status
│           │   ├── JoinForm.tsx        ← enter code → navigate to /event/:code
│           │   └── QRDisplay.tsx       ← react-qr-code + 6-char code text
│           └── pages/
│               ├── HomePage.tsx            ← JoinForm
│               ├── OrganiserLoginPage.tsx  ← password POST form
│               ├── CreateEventPage.tsx     ← event creation form
│               ├── EventPage.tsx           ← audience caption view
│               └── PresentPage.tsx         ← organiser mic + captions + QR
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/api/package.json`
- Create: `apps/web/package.json`
- Create: `packages/shared/package.json`

- [ ] **Step 1: Create root workspace files**

```bash
mkdir -p apps/api apps/web packages/shared
```

`package.json` (root):
```json
{
  "name": "caption-aotearoa",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "test": "pnpm --filter api test"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: Create `packages/shared/package.json`**

```json
{
  "name": "@caption-aotearoa/shared",
  "version": "0.0.1",
  "main": "./src/types.ts",
  "types": "./src/types.ts"
}
```

`packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

- [ ] **Step 3: Create `apps/api/package.json`**

```json
{
  "name": "api",
  "version": "0.0.1",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@caption-aotearoa/shared": "workspace:*",
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "microsoft-cognitiveservices-speech-sdk": "^1.36.0",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.11.5",
    "@types/supertest": "^6.0.2",
    "supertest": "^6.3.4",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3",
    "vitest": "^1.2.2"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `apps/web/package.json`**

```json
{
  "name": "web",
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@caption-aotearoa/shared": "workspace:*",
    "@supabase/supabase-js": "^2.39.0",
    "@tanstack/react-query": "^5.17.9",
    "axios": "^1.6.7",
    "lucide-react": "^0.316.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-qr-code": "^2.0.12",
    "react-router-dom": "^6.22.0",
    "socket.io-client": "^4.7.4"
  },
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12",
    "vitest": "^1.2.2"
  }
}
```

- [ ] **Step 5: Install all dependencies**

```bash
pnpm install
```

Expected: pnpm resolves workspace links, installs all packages, no errors.

- [ ] **Step 6: Commit**

```bash
git init
echo "node_modules\ndist\n.env\n.env.local" > .gitignore
git add .
git commit -m "chore: scaffold monorepo with pnpm workspaces"
```

---

## Task 2: Shared Types

**Files:**
- Create: `packages/shared/src/types.ts`

- [ ] **Step 1: Write the types**

`packages/shared/src/types.ts`:
```typescript
// Domain types
export interface Event {
  id: string
  code: string          // 6-char e.g. "KAI492"
  title: string
  description: string | null
  status: 'upcoming' | 'live' | 'ended'
  event_date: string | null
  phrase_list: string[]
  languages: string[]   // BCP-47 locales e.g. ["en-NZ", "mi-NZ"]
  created_at: string
}

export interface CaptionSegment {
  id: string
  event_id: string
  sequence: number
  text: string
  language: string      // BCP-47 locale
  is_final: boolean
  created_at: string
}

// Socket.io event payloads
export interface CaptionSegmentPayload {
  id: string
  segments: Record<string, string>  // locale → text
  isFinal: boolean
  sequence: number
}

export interface CaptionHistoryPayload {
  segments: CaptionSegmentPayload[]
}

export interface CaptionErrorPayload {
  message: string
  fatal?: boolean
}

// Socket.io event map (used for typing socket.on/emit)
export interface ServerToClientEvents {
  'caption:segment': (payload: CaptionSegmentPayload) => void
  'caption:history': (payload: CaptionHistoryPayload) => void
  'caption:error': (payload: CaptionErrorPayload) => void
}

export interface ClientToServerEvents {
  'audio:chunk': (chunk: ArrayBuffer) => void
  'event:join': (code: string) => void
  'event:leave': (code: string) => void
  'session:start': (code: string) => void
  'session:end': (code: string) => void
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared types for events, captions, socket events"
```

---

## Task 3: API Foundation

**Files:**
- Create: `apps/api/src/config.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/.env.example`

- [ ] **Step 1: Create `apps/api/src/config.ts`**

```typescript
import 'dotenv/config'

function require(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

export const config = {
  port: parseInt(process.env.PORT ?? '3002', 10),
  clientUrl: require('CLIENT_URL'),
  presenterSecret: require('PRESENTER_SECRET'),
  jwtSecret: require('JWT_SECRET'),
  supabaseUrl: require('SUPABASE_URL'),
  supabaseServiceRoleKey: require('SUPABASE_SERVICE_ROLE_KEY'),
  azure: {
    speechKey: require('AZURE_SPEECH_KEY'),
    speechRegion: require('AZURE_SPEECH_REGION'),
  },
}
```

- [ ] **Step 2: Create `apps/api/.env.example`**

```
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=australiaeast
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PRESENTER_SECRET=
JWT_SECRET=
PORT=3002
CLIENT_URL=http://localhost:5173
```

Copy to `.env` and fill in values before running.

- [ ] **Step 3: Create `apps/api/src/index.ts`**

```typescript
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'
import { config } from './config'
import { authRouter } from './routes/auth'
import { eventsRouter } from './routes/events'
import { setupSocketHandler } from './services/SocketHandler'

const app = express()
const httpServer = createServer(app)

export const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: config.clientUrl, methods: ['GET', 'POST'] },
})

app.use(cors({ origin: config.clientUrl }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/events', eventsRouter)

setupSocketHandler(io)

export { app }

// Only start server when run directly (not when imported in tests)
if (require.main === module) {
  httpServer.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`)
  })
}
```

- [ ] **Step 4: Verify the API starts**

```bash
cd apps/api
cp .env.example .env
# fill in real values, then:
pnpm dev
```

Expected: `API listening on port 3002` (will fail on missing services — that's fine for now, just checking it compiles)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/config.ts apps/api/src/index.ts apps/api/.env.example
git commit -m "feat: api foundation — express + socket.io + config"
```

---

## Task 4: JWT Auth

**Files:**
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { app } from '../index'

// Override config for tests
process.env.PRESENTER_SECRET = 'test-secret'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.CLIENT_URL = 'http://localhost:5173'

describe('POST /api/auth/login', () => {
  it('returns 200 + JWT token with correct password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'test-secret' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(typeof res.body.token).toBe('string')
  })

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body.token).toBeUndefined()
  })

  it('returns 400 with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api && pnpm test
```

Expected: FAIL — routes not implemented yet.

- [ ] **Step 3: Create `apps/api/src/middleware/auth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }
  try {
    jwt.verify(header.slice(7), config.jwtSecret)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

- [ ] **Step 4: Create `apps/api/src/routes/auth.ts`**

```typescript
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const { password } = req.body
  if (!password) {
    res.status(400).json({ error: 'Password required' })
    return
  }
  if (password !== config.presenterSecret) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }
  const token = jwt.sign({ role: 'organiser' }, config.jwtSecret, { expiresIn: '24h' })
  res.json({ token })
})
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd apps/api && pnpm test
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/middleware apps/api/src/routes/auth.ts apps/api/src/__tests__/auth.test.ts
git commit -m "feat: jwt auth endpoint + middleware"
```

---

## Task 5: Supabase Setup

**Files:**
- Create: `apps/api/src/services/supabase.ts`
- SQL migration (run in Supabase dashboard)

- [ ] **Step 1: Run SQL migration in Supabase dashboard**

Go to Supabase project → SQL Editor → New query. Run:

```sql
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  title       text not null,
  description text,
  status      text not null default 'upcoming'
    check (status in ('upcoming', 'live', 'ended')),
  event_date  timestamptz,
  phrase_list text[] not null default '{}',
  languages   text[] not null default '{"en-NZ"}',
  created_at  timestamptz not null default now()
);

create table if not exists caption_segments (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  sequence    bigint not null,
  text        text not null,
  language    text not null default 'en-NZ',
  is_final    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index on caption_segments (event_id, sequence);

-- Public read access (no auth for MVP)
alter table events enable row level security;
alter table caption_segments enable row level security;

create policy "public read events" on events for select using (true);
create policy "public read caption_segments" on caption_segments for select using (true);
-- API server uses service role key, bypasses RLS for writes
```

- [ ] **Step 2: Create `apps/api/src/services/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

// Service role client — bypasses RLS, server-side only
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/supabase.ts
git commit -m "feat: supabase client (service role) + migration instructions"
```

---

## Task 6: Events Routes

**Files:**
- Create: `apps/api/src/routes/events.ts`
- Create: `apps/api/src/__tests__/events.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/__tests__/events.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../index'
import * as supabaseModule from '../services/supabase'

// Mock supabase
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockEvent = {
  id: 'uuid-1',
  code: 'KAI492',
  title: 'Test Event',
  description: null,
  status: 'upcoming',
  event_date: null,
  phrase_list: ['karakia'],
  languages: ['en-NZ'],
  created_at: new Date().toISOString(),
}

function mockChain(returnData: unknown, error: unknown = null) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error }),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }
  vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any)
  return chain
}

// Get a valid JWT for protected routes
async function getToken(): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ password: 'test-secret' })
  return res.body.token
}

describe('POST /api/events', () => {
  it('creates an event and returns it with a code', async () => {
    mockChain(mockEvent)
    const token = await getToken()
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Event', phrase_list: ['karakia'], languages: ['en-NZ'] })
    expect(res.status).toBe(201)
    expect(res.body.code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/events').send({ title: 'Test' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/events/:code', () => {
  it('returns event by code', async () => {
    mockChain(mockEvent)
    const res = await request(app).get('/api/events/KAI492')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe('KAI492')
  })

  it('returns 404 when not found', async () => {
    mockChain(null, { code: 'PGRST116', message: 'Not found' })
    const res = await request(app).get('/api/events/XXXXXX')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api && pnpm test
```

Expected: FAIL — route not implemented.

- [ ] **Step 3: Create `apps/api/src/routes/events.ts`**

```typescript
import { Router } from 'express'
import { verifyJWT } from '../middleware/auth'
import { supabase } from '../services/supabase'
import { EventManager } from '../services/EventManager'

export const eventsRouter = Router()

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// POST /api/events — create event (JWT protected)
eventsRouter.post('/', verifyJWT, async (req, res) => {
  const { title, description, event_date, phrase_list, languages } = req.body
  if (!title) {
    res.status(400).json({ error: 'title required' })
    return
  }

  const code = generateCode()
  const { data, error } = await supabase
    .from('events')
    .insert({ code, title, description, event_date, phrase_list: phrase_list ?? [], languages: languages ?? ['en-NZ'] })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(201).json(data)
})

// GET /api/events/:code — fetch event by 6-char code (public)
eventsRouter.get('/:code', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('code', req.params.code.toUpperCase())
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Event not found' })
    return
  }
  res.json(data)
})

// PATCH /api/events/:code/status — update status (JWT protected)
eventsRouter.patch('/:code/status', verifyJWT, async (req, res) => {
  const { status } = req.body
  if (!['upcoming', 'live', 'ended'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }

  const { data, error } = await supabase
    .from('events')
    .update({ status })
    .eq('code', req.params.code.toUpperCase())
    .select()
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'Event not found' })
    return
  }

  // If ending the event, close any active Azure session
  if (status === 'ended') {
    EventManager.end(req.params.code.toUpperCase())
  }

  res.json(data)
})
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/events.ts apps/api/src/__tests__/events.test.ts
git commit -m "feat: events routes — create, fetch by code, update status"
```

---

## Task 7: AzureSession Service

**Files:**
- Create: `apps/api/src/services/AzureSession.ts`
- Create: `apps/api/src/__tests__/AzureSession.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/__tests__/AzureSession.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Azure SDK before importing AzureSession
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const pushStreamMock = { write: vi.fn(), close: vi.fn() }
  const recognizerMock = {
    startContinuousRecognitionAsync: vi.fn((ok) => ok()),
    stopContinuousRecognitionAsync: vi.fn((ok) => ok()),
    close: vi.fn(),
    recognizing: null as any,
    recognized: null as any,
    canceled: null as any,
  }
  return {
    SpeechTranslationConfig: {
      fromSubscription: vi.fn(() => ({
        speechRecognitionLanguage: '',
        addTargetLanguage: vi.fn(),
      })),
    },
    AudioConfig: {
      fromStreamInput: vi.fn(() => ({})),
    },
    AudioInputStream: {
      createPushStream: vi.fn(() => pushStreamMock),
    },
    AudioStreamFormat: {
      getWaveFormatPCM: vi.fn(),
    },
    TranslationRecognizer: vi.fn(() => recognizerMock),
    PhraseListGrammar: {
      fromRecognizer: vi.fn(() => ({ addPhrase: vi.fn() })),
    },
    ResultReason: { TranslatingSpeech: 1, TranslatedSpeech: 2 },
  }
})

import { AzureSession } from '../services/AzureSession'

describe('AzureSession', () => {
  let session: AzureSession
  let onSegment: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onSegment = vi.fn()
    session = new AzureSession({
      eventCode: 'KAI492',
      phraseList: ['karakia'],
      languages: ['en-NZ'],
      onSegment,
    })
  })

  it('starts without throwing', async () => {
    await expect(session.start()).resolves.not.toThrow()
  })

  it('writes audio chunks to push stream', async () => {
    await session.start()
    const buffer = new ArrayBuffer(320)
    session.pushChunk(Buffer.from(buffer))
    const sdk = await import('microsoft-cognitiveservices-speech-sdk')
    expect(sdk.AudioInputStream.createPushStream).toHaveBeenCalled()
  })

  it('stops and closes cleanly', async () => {
    await session.start()
    await expect(session.stop()).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api && pnpm test
```

Expected: FAIL — AzureSession not implemented.

- [ ] **Step 3: Create `apps/api/src/services/AzureSession.ts`**

```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import { supabase } from './supabase'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface AzureSessionOptions {
  eventCode: string
  phraseList: string[]
  languages: string[]           // BCP-47 locales; first is source (en-NZ)
  onSegment: (payload: CaptionSegmentPayload) => void
  onError?: (message: string, fatal: boolean) => void
}

export class AzureSession {
  private options: AzureSessionOptions
  private pushStream!: sdk.PushAudioInputStream
  private recognizer!: sdk.TranslationRecognizer
  private sequence = 0
  private eventId: string | null = null

  constructor(options: AzureSessionOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    // Fetch event UUID (needed for DB inserts)
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('code', this.options.eventCode)
      .single()
    this.eventId = data?.id ?? null

    this.createRecognizer()
    return new Promise((resolve, reject) => {
      this.recognizer.startContinuousRecognitionAsync(resolve, reject)
    })
  }

  private createRecognizer(): void {
    const [sourceLocale, ...targetLocales] = this.options.languages
    const speechConfig = sdk.SpeechTranslationConfig.fromSubscription(
      config.azure.speechKey,
      config.azure.speechRegion,
    )
    speechConfig.speechRecognitionLanguage = sourceLocale
    // Azure translation target locales use language code only (strip region)
    targetLocales.forEach((l) => speechConfig.addTargetLanguage(l.split('-')[0]))

    this.pushStream = sdk.AudioInputStream.createPushStream(
      sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1),
    )
    const audioConfig = sdk.AudioConfig.fromStreamInput(this.pushStream)
    this.recognizer = new sdk.TranslationRecognizer(speechConfig, audioConfig)

    // Load custom phrase hints (te reo etc.)
    if (this.options.phraseList.length > 0) {
      const grammar = sdk.PhraseListGrammar.fromRecognizer(this.recognizer)
      this.options.phraseList.forEach((p) => grammar.addPhrase(p))
    }

    this.recognizer.recognizing = (_, e) => {
      if (e.result.reason === sdk.ResultReason.TranslatingSpeech) {
        this.emit(e.result.text, e.result.translations, false)
      }
    }

    this.recognizer.recognized = (_, e) => {
      if (e.result.reason === sdk.ResultReason.TranslatedSpeech && e.result.text) {
        this.emit(e.result.text, e.result.translations, true)
      }
    }

    this.recognizer.canceled = (_, e) => {
      const fatal = e.errorCode !== sdk.CancellationErrorCode.NoError
      this.options.onError?.(`Azure canceled: ${e.errorDetails}`, fatal)
    }
  }

  private emit(
    sourceText: string,
    translations: sdk.TranslationRecognitionResult['translations'],
    isFinal: boolean,
  ): void {
    const seq = ++this.sequence
    const [sourceLocale] = this.options.languages

    const segments: Record<string, string> = { [sourceLocale]: sourceText }
    this.options.languages.slice(1).forEach((locale) => {
      const langCode = locale.split('-')[0]
      const translated = translations.get(langCode)
      if (translated) segments[locale] = translated
    })

    const payload: CaptionSegmentPayload = {
      id: uuidv4(),
      segments,
      isFinal,
      sequence: seq,
    }

    this.options.onSegment(payload)

    // Persist only final segments
    if (isFinal && this.eventId) {
      const rows = Object.entries(segments).map(([language, text]) => ({
        id: uuidv4(),
        event_id: this.eventId!,
        sequence: seq,
        text,
        language,
        is_final: true,
      }))
      supabase.from('caption_segments').insert(rows).then(({ error }) => {
        if (error) console.error('Failed to persist segments:', error.message)
      })
    }
  }

  pushChunk(chunk: Buffer): void {
    this.pushStream.write(chunk)
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.recognizer.stopContinuousRecognitionAsync(() => {
        this.pushStream.close()
        this.recognizer.close()
        resolve()
      }, reject)
    })
  }

  async restart(): Promise<void> {
    // Azure SDK does not support reusing a push stream after error.
    // Must create fresh recognizer + push stream.
    try { await this.stop() } catch { /* ignore cleanup errors */ }
    this.createRecognizer()
    return new Promise((resolve, reject) => {
      this.recognizer.startContinuousRecognitionAsync(resolve, reject)
    })
  }
}
```

Add `uuid` dependency:
```bash
cd apps/api && pnpm add uuid && pnpm add -D @types/uuid
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && pnpm test
```

Expected: AzureSession tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/AzureSession.ts apps/api/src/__tests__/AzureSession.test.ts
git commit -m "feat: AzureSession — TranslationRecognizer + PushAudioInputStream"
```

---

## Task 8: EventManager

**Files:**
- Create: `apps/api/src/services/EventManager.ts`
- Create: `apps/api/src/__tests__/EventManager.test.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/__tests__/EventManager.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/AzureSession', () => ({
  AzureSession: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    pushChunk: vi.fn(),
    restart: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Re-import after mock
const { EventManager } = await import('../services/EventManager')

describe('EventManager', () => {
  beforeEach(() => EventManager.clear())

  it('starts a new session for a code', async () => {
    const onSegment = vi.fn()
    await EventManager.start('KAI492', { phraseList: [], languages: ['en-NZ'] }, onSegment, vi.fn())
    expect(EventManager.has('KAI492')).toBe(true)
  })

  it('pushes a chunk to an active session', async () => {
    const onSegment = vi.fn()
    await EventManager.start('KAI492', { phraseList: [], languages: ['en-NZ'] }, onSegment, vi.fn())
    const chunk = Buffer.alloc(320)
    EventManager.pushChunk('KAI492', chunk)
    // No error thrown = pass
  })

  it('ends and removes a session', async () => {
    await EventManager.start('KAI492', { phraseList: [], languages: ['en-NZ'] }, vi.fn(), vi.fn())
    await EventManager.end('KAI492')
    expect(EventManager.has('KAI492')).toBe(false)
  })

  it('does not throw when ending a non-existent session', async () => {
    await expect(EventManager.end('XXXXXX')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api && pnpm test
```

- [ ] **Step 3: Create `apps/api/src/services/EventManager.ts`**

```typescript
import { AzureSession } from './AzureSession'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

interface SessionOptions {
  phraseList: string[]
  languages: string[]
}

type OnSegment = (payload: CaptionSegmentPayload) => void
type OnError = (message: string, fatal: boolean) => void

class EventManagerClass {
  private sessions = new Map<string, AzureSession>()

  async start(
    code: string,
    options: SessionOptions,
    onSegment: OnSegment,
    onError: OnError,
  ): Promise<void> {
    if (this.sessions.has(code)) await this.end(code)

    const session = new AzureSession({
      eventCode: code,
      phraseList: options.phraseList,
      languages: options.languages,
      onSegment,
      onError: async (message, fatal) => {
        onError(message, fatal)
        if (!fatal) {
          // Attempt one auto-restart
          try {
            await session.restart()
          } catch (e) {
            onError(`Restart failed: ${e}`, true)
            this.sessions.delete(code)
          }
        } else {
          this.sessions.delete(code)
        }
      },
    })

    await session.start()
    this.sessions.set(code, session)
  }

  pushChunk(code: string, chunk: Buffer): void {
    this.sessions.get(code)?.pushChunk(chunk)
  }

  async end(code: string): Promise<void> {
    const session = this.sessions.get(code)
    if (!session) return
    this.sessions.delete(code)
    try { await session.stop() } catch { /* ignore */ }
  }

  has(code: string): boolean {
    return this.sessions.has(code)
  }

  // Test helper
  clear(): void {
    this.sessions.clear()
  }
}

export const EventManager = new EventManagerClass()
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/EventManager.ts apps/api/src/__tests__/EventManager.test.ts
git commit -m "feat: EventManager — session lifecycle with auto-restart"
```

---

## Task 9: SocketHandler

**Files:**
- Create: `apps/api/src/services/SocketHandler.ts`

- [ ] **Step 1: Create `apps/api/src/services/SocketHandler.ts`**

```typescript
import type { Server, Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'
import { EventManager } from './EventManager'
import { supabase } from './supabase'
import { verifyJWT as verifyToken } from '../middleware/auth'

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>

const HISTORY_SIZE = 20

export function setupSocketHandler(io: AppServer): void {
  io.on('connection', (socket) => {
    // Audience joins an event room to receive captions
    socket.on('event:join', async (code) => {
      socket.join(code)

      // Send caption history so reconnects/late joiners see recent captions
      // Two-step: resolve event UUID first, then fetch segments
      const { data: eventRow } = await supabase
        .from('events')
        .select('id')
        .eq('code', code)
        .single()

      if (!eventRow) return

      const { data } = await supabase
        .from('caption_segments')
        .select('*')
        .eq('event_id', eventRow.id)
        .eq('is_final', true)
        .order('sequence', { ascending: true })
        .limit(HISTORY_SIZE)

      if (data && data.length > 0) {
        // Group rows by sequence into CaptionSegmentPayload format
        const grouped = new Map<number, { id: string; segments: Record<string, string>; sequence: number }>()
        for (const row of data) {
          if (!grouped.has(row.sequence)) {
            grouped.set(row.sequence, { id: row.id, segments: {}, sequence: row.sequence })
          }
          grouped.get(row.sequence)!.segments[row.language] = row.text
        }
        const segments = Array.from(grouped.values()).map((s) => ({ ...s, isFinal: true }))
        socket.emit('caption:history', { segments })
      }
    })

    socket.on('event:leave', (code) => {
      socket.leave(code)
    })

    // Organiser starts a captioning session
    socket.on('session:start', async (code) => {
      if (!isAuthorised(socket)) {
        socket.emit('caption:error', { message: 'Unauthorised', fatal: true })
        return
      }

      // Fetch event options from DB
      const { data: event } = await supabase
        .from('events')
        .select('phrase_list, languages')
        .eq('code', code)
        .single()

      if (!event) {
        socket.emit('caption:error', { message: 'Event not found', fatal: true })
        return
      }

      await EventManager.start(
        code,
        { phraseList: event.phrase_list, languages: event.languages },
        (payload) => {
          io.to(code).emit('caption:segment', payload)
        },
        (message, fatal) => {
          io.to(code).emit('caption:error', { message, fatal })
        },
      )
    })

    // Organiser ends the captioning session
    socket.on('session:end', async (code) => {
      await EventManager.end(code)
    })

    // Incoming PCM audio chunk from organiser
    socket.on('audio:chunk', (chunk) => {
      // Find which room this socket is in that has an active session
      socket.rooms.forEach((room) => {
        if (EventManager.has(room)) {
          EventManager.pushChunk(room, Buffer.from(chunk))
        }
      })
    })
  })
}

// Validate JWT from socket handshake auth
function isAuthorised(socket: Socket): boolean {
  try {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return false
    const jwt = require('jsonwebtoken')
    const { config } = require('../config')
    jwt.verify(token, config.jwtSecret)
    return true
  } catch {
    return false
  }
}
```

> Note: The `event:join` history query uses a sub-select. If Supabase returns an error, silently skip history (late-join without history is acceptable for MVP).

- [ ] **Step 2: Verify full API compiles and starts**

```bash
cd apps/api && pnpm dev
```

Expected: `API listening on port 3002` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/SocketHandler.ts
git commit -m "feat: socket handler — rooms, audio routing, caption broadcast, history"
```

---

## Task 10: Web App Foundation

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/router.tsx`
- Create: `apps/web/src/styles/index.css`

- [ ] **Step 1: Create config files**

`apps/web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
```

`apps/web/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-purple':      '#493276',
        'brand-purple-dark': '#2c1e47',
        'brand-navy':        '#253e51',
        'brand-sand':        '#fdfdf0',
        'brand-black':       '#1e1c20',
        'brand-error':       '#9d2020',
      },
      fontFamily: {
        sans:  ['Roboto', 'Arial', 'Helvetica', 'sans-serif'],
        serif: ['Roboto Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        body: ['1.125rem', { lineHeight: '1.75' }],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config
```

`apps/web/postcss.config.js`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

`apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create `apps/web/src/styles/index.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Serif:wght@400;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-brand-sand text-brand-black font-sans;
  }
}

/* Pill button variants */
@layer components {
  .btn-primary {
    @apply bg-brand-purple text-white rounded-pill px-6 py-2.5 font-medium
           hover:bg-brand-purple-dark transition-colors focus:outline-none
           focus:ring-2 focus:ring-brand-purple focus:ring-offset-2;
  }
  .btn-secondary {
    @apply bg-brand-sand text-brand-purple border-2 border-brand-purple
           rounded-pill px-6 py-2.5 font-medium hover:bg-brand-purple
           hover:text-white transition-colors;
  }
  .input-field {
    @apply bg-brand-sand border-2 border-brand-purple rounded-lg px-4 py-2.5
           w-full focus:outline-none focus:ring-2 focus:ring-brand-purple
           focus:ring-offset-1 text-brand-black;
  }
}
```

- [ ] **Step 3: Create entry files**

`apps/web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Caption Aotearoa</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/main.tsx`:
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/index.css'
import { AppRouter } from './router'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  </StrictMode>,
)
```

`apps/web/src/router.tsx`:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { EventPage } from './pages/EventPage'
import { OrganiserLoginPage } from './pages/OrganiserLoginPage'
import { CreateEventPage } from './pages/CreateEventPage'
import { PresentPage } from './pages/PresentPage'
import { ProtectedRoute } from './components/ProtectedRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:code" element={<EventPage />} />
        <Route path="/organiser-login" element={<OrganiserLoginPage />} />
        <Route path="/create" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
        <Route path="/present/:code" element={<ProtectedRoute><PresentPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
```

`apps/web/src/App.tsx`:
```typescript
// App.tsx is minimal — routing handled by router.tsx
export { AppRouter as default } from './router'
```

- [ ] **Step 4: Verify web app starts**

```bash
cd apps/web && pnpm dev
```

Expected: Vite dev server starts on port 5173 with no errors (pages will be empty stubs).

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: web app foundation — vite, tailwind, whaikaha design tokens, routing"
```

---

## Task 11: Auth (Frontend)

**Files:**
- Create: `apps/web/src/hooks/useAuth.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/components/ProtectedRoute.tsx`
- Create: `apps/web/src/pages/OrganiserLoginPage.tsx`

- [ ] **Step 1: Create `apps/web/src/hooks/useAuth.ts`**

```typescript
const TOKEN_KEY = 'caption_organiser_token'

export function useAuth() {
  function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  }

  function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
  }

  function isAuthenticated(): boolean {
    const token = getToken()
    if (!token) return false
    try {
      // Decode JWT payload without verifying signature (client-side check only)
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp > Date.now() / 1000
    } catch {
      return false
    }
  }

  return { getToken, setToken, clearToken, isAuthenticated }
}
```

- [ ] **Step 2: Create `apps/web/src/lib/api.ts`**

```typescript
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002'

export const api = axios.create({ baseURL: API_URL })

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('caption_organiser_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

- [ ] **Step 3: Create `apps/web/src/components/ProtectedRoute.tsx`**

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated() ? <>{children}</> : <Navigate to="/organiser-login" replace />
}
```

- [ ] **Step 4: Create `apps/web/src/pages/OrganiserLoginPage.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export function OrganiserLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setToken } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post<{ token: string }>('/api/auth/login', { password })
      setToken(data.token)
      navigate('/create')
    } catch {
      setError('Incorrect password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl font-semibold text-brand-purple-dark mb-8">
          Organiser Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-brand-error text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `apps/web/.env.example`**

```
VITE_API_URL=http://localhost:3002
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Copy to `.env.local` and fill in values.

- [ ] **Step 6: Verify login page works**

```bash
pnpm dev:web
```

Open `http://localhost:5173/organiser-login`. Enter wrong password — expect error. Start API (`pnpm dev:api`) and enter correct password — expect redirect to `/create`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/hooks/useAuth.ts apps/web/src/lib/api.ts apps/web/src/components/ProtectedRoute.tsx apps/web/src/pages/OrganiserLoginPage.tsx apps/web/.env.example
git commit -m "feat: organiser auth — login page, jwt storage, protected route"
```

---

## Task 12: Create Event Page

**Files:**
- Create: `apps/web/src/pages/CreateEventPage.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/CreateEventPage.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Event } from '@caption-aotearoa/shared'

const SUPPORTED_LANGUAGES = [
  { locale: 'en-NZ', label: 'English (NZ)' },
  { locale: 'mi-NZ', label: 'Te reo Māori' },
  { locale: 'sm-WS', label: 'Samoan' },
  { locale: 'to-TO', label: 'Tongan' },
]

export function CreateEventPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [phrases, setPhrases] = useState('')
  const [languages, setLanguages] = useState<string[]>(['en-NZ'])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleLanguage(locale: string) {
    if (locale === 'en-NZ') return  // always required
    setLanguages((prev) =>
      prev.includes(locale) ? prev.filter((l) => l !== locale) : [...prev, locale],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const phrase_list = phrases
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
      const { data } = await api.post<Event>('/api/events', {
        title,
        description: description || null,
        event_date: eventDate || null,
        phrase_list,
        languages,
      })
      navigate(`/present/${data.code}`)
    } catch {
      setError('Failed to create event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="font-serif text-4xl font-semibold text-brand-purple-dark mb-8">
        New Event
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-1">Event title *</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea className="input-field h-24 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block font-medium mb-1">Event date</label>
          <input type="datetime-local" className="input-field" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div>
          <label className="block font-medium mb-1">
            Custom phrases (comma-separated)
          </label>
          <p className="text-sm text-brand-purple mb-2">
            Add te reo, names, or event-specific words to improve accuracy
          </p>
          <input
            className="input-field"
            placeholder="karakia, wharenui, Whaikaha"
            value={phrases}
            onChange={(e) => setPhrases(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium mb-2">Caption languages</label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map(({ locale, label }) => (
              <button
                key={locale}
                type="button"
                onClick={() => toggleLanguage(locale)}
                className={`rounded-pill px-4 py-1.5 text-sm font-medium border-2 transition-colors
                  ${languages.includes(locale)
                    ? 'bg-brand-purple text-white border-brand-purple'
                    : 'bg-brand-sand text-brand-purple border-brand-purple'
                  } ${locale === 'en-NZ' ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-brand-error text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Test manually**

Create an event → should redirect to `/present/[CODE]` (will 404 for now).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/CreateEventPage.tsx
git commit -m "feat: create event page with phrase list + language selection"
```

---

## Task 13: Audio Capture (AudioWorklet)

**Files:**
- Create: `apps/web/public/audio-processor.js`
- Create: `apps/web/src/lib/socket.ts`
- Create: `apps/web/src/hooks/useAudioCapture.ts`

- [ ] **Step 1: Create `apps/web/public/audio-processor.js`**

This file must be plain JS (not TypeScript) and served as a static asset. It runs inside a Web Audio WorkletGlobalScope.

```javascript
// audio-processor.js
// Converts Float32 audio samples to 16-bit PCM and posts the buffer
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const float32 = input[0]  // mono channel
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      // Clamp to [-1, 1] then scale to Int16 range
      const clamped = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    }
    // Transfer the buffer (zero-copy) to the main thread
    this.port.postMessage(int16.buffer, [int16.buffer])
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
```

- [ ] **Step 2: Create `apps/web/src/lib/socket.ts`**

```typescript
import { io } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@caption-aotearoa/shared'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002'

// Singleton socket — do not reconnect on every render
export const socket = io<ServerToClientEvents, ClientToServerEvents>(API_URL, {
  autoConnect: false,
  auth: () => ({ token: localStorage.getItem('caption_organiser_token') ?? '' }),
})
```

- [ ] **Step 3: Create `apps/web/src/hooks/useAudioCapture.ts`**

```typescript
import { useRef, useState, useCallback } from 'react'
import { socket } from '../lib/socket'

interface UseAudioCaptureReturn {
  isCapturing: boolean
  start: () => Promise<void>
  stop: () => void
  error: string | null
}

export function useAudioCapture(eventCode: string): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    setError(null)
    try {
      // AudioContext must be created at 16kHz to match Azure's expected format
      const ctx = new AudioContext({ sampleRate: 16000 })
      contextRef.current = ctx

      // Load the PCM worklet
      await ctx.audioWorklet.addModule('/audio-processor.js')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
      })
      streamRef.current = stream

      const source = ctx.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(ctx, 'pcm-processor')
      workletRef.current = worklet

      // Each message is an ArrayBuffer of Int16 PCM samples
      worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        socket.emit('audio:chunk', e.data)
      }

      source.connect(worklet)
      // Connect to destination to keep the graph alive (no audio output)
      worklet.connect(ctx.destination)

      if (!socket.connected) socket.connect()
      socket.emit('session:start', eventCode)
      setIsCapturing(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone access failed')
    }
  }, [eventCode])

  const stop = useCallback(() => {
    workletRef.current?.disconnect()
    workletRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    contextRef.current?.close()
    contextRef.current = null
    socket.emit('session:end', eventCode)
    setIsCapturing(false)
  }, [eventCode])

  return { isCapturing, start, stop, error }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/audio-processor.js apps/web/src/lib/socket.ts apps/web/src/hooks/useAudioCapture.ts
git commit -m "feat: audio capture — AudioWorklet PCM to socket, socket singleton"
```

---

## Task 14: useCaptions Hook

**Files:**
- Create: `apps/web/src/hooks/useCaptions.ts`

- [ ] **Step 1: Create `apps/web/src/hooks/useCaptions.ts`**

```typescript
import { useState, useEffect, useRef } from 'react'
import { socket } from '../lib/socket'
import type { CaptionSegmentPayload } from '@caption-aotearoa/shared'

export interface DisplaySegment {
  id: string
  text: string
  isFinal: boolean
  sequence: number
}

interface UseCaptionsReturn {
  segments: DisplaySegment[]
  isConnected: boolean
  error: string | null
}

export function useCaptions(eventCode: string, locale: string): UseCaptionsReturn {
  const [segments, setSegments] = useState<DisplaySegment[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Store all language variants; re-render when locale changes
  const allSegmentsRef = useRef<Map<number, CaptionSegmentPayload>>(new Map())

  function extractSegments(locale: string): DisplaySegment[] {
    return Array.from(allSegmentsRef.current.values())
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({
        id: s.id,
        text: s.segments[locale] ?? s.segments['en-NZ'] ?? '',
        isFinal: s.isFinal,
        sequence: s.sequence,
      }))
  }

  useEffect(() => {
    if (!socket.connected) socket.connect()

    socket.emit('event:join', eventCode)
    setIsConnected(socket.connected)

    function onConnect() { setIsConnected(true) }
    function onDisconnect() { setIsConnected(false) }

    function onHistory(payload: { segments: CaptionSegmentPayload[] }) {
      payload.segments.forEach((s) => allSegmentsRef.current.set(s.sequence, s))
      setSegments(extractSegments(locale))
    }

    function onSegment(payload: CaptionSegmentPayload) {
      // Interim segments replace each other (same sequence overwrite is fine)
      // Final segments are kept permanently
      allSegmentsRef.current.set(payload.sequence, payload)
      setSegments(extractSegments(locale))
    }

    function onError(payload: { message: string }) {
      setError(payload.message)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('caption:history', onHistory)
    socket.on('caption:segment', onSegment)
    socket.on('caption:error', onError)

    return () => {
      socket.emit('event:leave', eventCode)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('caption:history', onHistory)
      socket.off('caption:segment', onSegment)
      socket.off('caption:error', onError)
    }
  }, [eventCode])

  // Re-derive display segments when locale changes
  useEffect(() => {
    setSegments(extractSegments(locale))
  }, [locale])

  return { segments, isConnected, error }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/useCaptions.ts
git commit -m "feat: useCaptions hook — socket events to caption state with locale switching"
```

---

## Task 15: CaptionDisplay Component

**Files:**
- Create: `apps/web/src/components/CaptionDisplay.tsx`

- [ ] **Step 1: Create `apps/web/src/components/CaptionDisplay.tsx`**

```typescript
import { useEffect, useRef } from 'react'
import type { DisplaySegment } from '../hooks/useCaptions'

interface Props {
  segments: DisplaySegment[]
  className?: string
}

export function CaptionDisplay({ segments, className = '' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest caption
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [segments])

  return (
    <div
      className={`overflow-y-auto rounded-lg p-6 space-y-2 ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Live captions"
    >
      {segments.map((seg) => (
        <p
          key={`${seg.sequence}-${seg.isFinal}`}
          className={`text-2xl leading-relaxed transition-colors duration-200 ${
            seg.isFinal
              ? 'text-brand-black'
              : 'text-brand-purple opacity-70 italic'
          }`}
        >
          {seg.text}
        </p>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/CaptionDisplay.tsx
git commit -m "feat: CaptionDisplay — auto-scroll, interim/final styling, aria-live"
```

---

## Task 16: Audience Event Page

**Files:**
- Create: `apps/web/src/pages/EventPage.tsx`

- [ ] **Step 1: Create `apps/web/src/pages/EventPage.tsx`**

```typescript
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import type { Event } from '@caption-aotearoa/shared'

const LANGUAGE_LABELS: Record<string, string> = {
  'en-NZ': 'English',
  'mi-NZ': 'Te reo',
  'sm-WS': 'Samoan',
  'to-TO': 'Tongan',
}

export function EventPage() {
  const { code } = useParams<{ code: string }>()
  const [selectedLocale, setSelectedLocale] = useState('en-NZ')

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
  })

  const { segments, isConnected, error: captionError } = useCaptions(code ?? '', selectedLocale)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-brand-purple text-lg">Loading event…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-brand-error text-lg">Event not found. Check your code and try again.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold">{event.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-yellow-400'
              }`}
            />
            <span className="text-sm opacity-80">
              {isConnected ? (event.status === 'live' ? 'Live' : 'Connected') : 'Connecting…'}
            </span>
          </div>
        </div>
        {/* Language switcher */}
        {event.languages.length > 1 && (
          <div className="flex gap-2">
            {event.languages.map((locale) => (
              <button
                key={locale}
                onClick={() => setSelectedLocale(locale)}
                className={`rounded-pill px-3 py-1 text-sm font-medium transition-colors ${
                  selectedLocale === locale
                    ? 'bg-white text-brand-navy'
                    : 'bg-transparent text-white border border-white opacity-70 hover:opacity-100'
                }`}
              >
                {LANGUAGE_LABELS[locale] ?? locale}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Caption area */}
      {captionError && (
        <div className="bg-brand-error text-white px-6 py-3 text-sm">
          {captionError}
        </div>
      )}
      <main className="flex-1 overflow-hidden p-6">
        {segments.length === 0 && event.status !== 'live' && (
          <p className="text-brand-purple opacity-60 text-lg text-center mt-16">
            Waiting for captions to begin…
          </p>
        )}
        <CaptionDisplay
          segments={segments}
          className="h-full bg-white border-2 border-brand-purple border-opacity-20"
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/EventPage.tsx
git commit -m "feat: audience event page — live captions + language switcher"
```

---

## Task 17: Present Page (Organiser)

**Files:**
- Create: `apps/web/src/components/MicControl.tsx`
- Create: `apps/web/src/components/QRDisplay.tsx`
- Create: `apps/web/src/pages/PresentPage.tsx`

- [ ] **Step 1: Create `apps/web/src/components/MicControl.tsx`**

```typescript
import { Mic, MicOff, Square } from 'lucide-react'

interface Props {
  isCapturing: boolean
  onStart: () => void
  onStop: () => void
  error: string | null
  disabled?: boolean
}

export function MicControl({ isCapturing, onStart, onStop, error, disabled }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isCapturing ? onStop : onStart}
        disabled={disabled}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all
          shadow-lg text-white text-3xl
          ${isCapturing
            ? 'bg-brand-error hover:bg-red-800 animate-pulse'
            : 'bg-brand-purple hover:bg-brand-purple-dark'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isCapturing ? 'Stop captioning' : 'Start captioning'}
      >
        {isCapturing ? <Square size={32} /> : <Mic size={32} />}
      </button>
      <p className="text-sm font-medium text-brand-purple">
        {isCapturing ? 'Captioning live — tap to stop' : 'Tap to start captioning'}
      </p>
      {error && <p className="text-brand-error text-sm">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create `apps/web/src/components/QRDisplay.tsx`**

```typescript
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { X, QrCode } from 'lucide-react'

interface Props {
  eventCode: string
}

export function QRDisplay({ eventCode }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const audienceUrl = `${window.location.origin}/event/${eventCode}`

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 bg-brand-sand flex flex-col items-center justify-center z-50 p-12"
        onClick={() => setFullscreen(false)}
      >
        <button
          className="absolute top-6 right-6 text-brand-purple hover:text-brand-purple-dark"
          aria-label="Close QR code"
        >
          <X size={32} />
        </button>
        <QRCode value={audienceUrl} size={280} fgColor="#493276" bgColor="#fdfdf0" />
        <p className="font-mono text-5xl font-bold text-brand-purple mt-8 tracking-widest">
          {eventCode}
        </p>
        <p className="text-brand-purple opacity-60 mt-4 text-lg">
          Scan to join · Tap anywhere to close
        </p>
      </div>
    )
  }

  return (
    <button
      onClick={() => setFullscreen(true)}
      className="btn-secondary flex items-center gap-2"
    >
      <QrCode size={18} />
      Show QR code
    </button>
  )
}
```

- [ ] **Step 3: Create `apps/web/src/pages/PresentPage.tsx`**

```typescript
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useCaptions } from '../hooks/useCaptions'
import { CaptionDisplay } from '../components/CaptionDisplay'
import { MicControl } from '../components/MicControl'
import { QRDisplay } from '../components/QRDisplay'
import type { Event } from '@caption-aotearoa/shared'

export function PresentPage() {
  const { code } = useParams<{ code: string }>()
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', code],
    queryFn: () => api.get<Event>(`/api/events/${code}`).then((r) => r.data),
    enabled: !!code,
  })

  const { isCapturing, start, stop, error: audioError } = useAudioCapture(code ?? '')
  const { segments } = useCaptions(code ?? '', 'en-NZ')

  async function handleStart() {
    await api.patch(`/api/events/${code}/status`, { status: 'live' })
    await start()
  }

  async function handleStop() {
    stop()
    await api.patch(`/api/events/${code}/status`, { status: 'ended' })
  }

  if (isLoading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-brand-purple">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-navy text-white px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold">{event.title}</h1>
        <QRDisplay eventCode={event.code} />
      </header>

      <main className="flex-1 flex flex-col items-center gap-8 p-8">
        <MicControl
          isCapturing={isCapturing}
          onStart={handleStart}
          onStop={handleStop}
          error={audioError}
        />

        <div className="w-full max-w-2xl">
          <p className="text-sm font-medium text-brand-purple mb-2 uppercase tracking-wide">
            Live preview
          </p>
          <CaptionDisplay
            segments={segments}
            className="h-64 bg-white border-2 border-brand-purple border-opacity-20"
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-brand-purple opacity-60">
            Audience join URL:{' '}
            <span className="font-mono font-semibold">
              {window.location.origin}/event/{event.code}
            </span>
          </p>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/MicControl.tsx apps/web/src/components/QRDisplay.tsx apps/web/src/pages/PresentPage.tsx
git commit -m "feat: present page — mic control, QR display, live caption preview"
```

---

## Task 18: Home Page

**Files:**
- Create: `apps/web/src/components/JoinForm.tsx`
- Create: `apps/web/src/pages/HomePage.tsx`

- [ ] **Step 1: Create `apps/web/src/components/JoinForm.tsx`**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Event } from '@caption-aotearoa/shared'

export function JoinForm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.get<Event>(`/api/events/${code.toUpperCase()}`)
      navigate(`/event/${code.toUpperCase()}`)
    } catch {
      setError('Event not found. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div>
        <label htmlFor="code" className="block font-medium mb-1">
          Event code
        </label>
        <input
          id="code"
          className="input-field text-2xl font-mono uppercase tracking-widest text-center"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="KAI492"
          maxLength={6}
          required
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>
      {error && <p className="text-brand-error text-sm">{error}</p>}
      <button type="submit" disabled={loading || code.length !== 6} className="btn-primary">
        {loading ? 'Finding event…' : 'Join event'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `apps/web/src/pages/HomePage.tsx`**

```typescript
import { JoinForm } from '../components/JoinForm'
import { useNavigate } from 'react-router-dom'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-12">
      <div className="text-center max-w-lg">
        <h1 className="font-serif text-5xl font-bold text-brand-purple-dark mb-4">
          Caption Aotearoa
        </h1>
        <p className="text-body text-brand-black opacity-80">
          Live captions for community events across Aotearoa New Zealand.
          No app needed — just scan the QR code or enter your event code.
        </p>
      </div>

      <JoinForm />

      <button
        onClick={() => navigate('/organiser-login')}
        className="text-sm text-brand-purple underline underline-offset-4 hover:text-brand-purple-dark"
      >
        Organiser? Sign in here
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/JoinForm.tsx apps/web/src/pages/HomePage.tsx
git commit -m "feat: home page with join-by-code form"
```

---

## Task 19: End-to-End Smoke Test

- [ ] **Step 1: Start both services**

```bash
# Terminal 1
pnpm dev:api

# Terminal 2
pnpm dev:web
```

- [ ] **Step 2: Create a test event**

1. Open `http://localhost:5173`
2. Click "Organiser? Sign in here" → `/organiser-login`
3. Enter `PRESENTER_SECRET` from `.env` → redirects to `/create`
4. Fill in: Title = "Pilot Test", phrases = "karakia, aroha", languages = English only
5. Submit → redirects to `/present/[CODE]`
6. Note the 6-char code shown in the URL

- [ ] **Step 3: Join as audience**

Open `http://localhost:5173/event/[CODE]` in a second browser tab or phone on the same network.

Expected: "Waiting for captions to begin…"

- [ ] **Step 4: Start captioning**

In the present tab: click the mic button. Browser asks for microphone permission — allow.

Expected:
- Mic button turns red and pulses
- Speak into the mic
- Captions appear in both the present tab preview and the audience tab within ~2 seconds

- [ ] **Step 5: Test QR code**

Click "Show QR code" in the present tab. QR code should display fullscreen. Scan with a phone — should open the event page and receive captions.

- [ ] **Step 6: Test with pilot user**

Share the event code or QR with your Deaf friend. Ask them to join on their device. Start captioning and have a conversation. Confirm captions are readable and accurate.

- [ ] **Step 7: Stop captioning and verify DB**

Click the stop button. Go to Supabase dashboard → Table Editor → `caption_segments`. Confirm final segments are saved with correct `event_id`, `sequence`, and `language`.

- [ ] **Step 8: Commit final state**

```bash
git add .
git commit -m "chore: mvp complete — end-to-end verified with pilot user"
```

---

## Task 20: Deploy for Grant Application

> **Platform choice:** Using **Render** (free tier) for MVP to keep costs zero during the pilot/application phase. Render and Railway are near-identical for this stack — same persistent process model, same auto TLS, same GitHub deploy flow.
>
> **Planned migration:** Switch to Railway after the grant is awarded — Railway has no free tier but is more reliable at scale and won't spin down between events.
>
> **If Render doesn't work:** Pivot to Railway immediately using the same steps below — just substitute "Railway" for "Render" and "New Project" for "New Web Service". All env vars and the `render.yaml` are not needed on Railway; it auto-detects Node.js. The pivot takes ~10 minutes.

- [ ] **Step 1: Add `render.yaml` to repo root**

Render uses this file to locate the API service within the monorepo:

```yaml
services:
  - type: web
    name: caption-aotearoa-api
    runtime: node
    rootDir: apps/api
    buildCommand: pnpm install && pnpm --filter api build
    startCommand: node dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: AZURE_SPEECH_KEY
        sync: false
      - key: AZURE_SPEECH_REGION
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: PRESENTER_SECRET
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: CLIENT_URL
        sync: false
```

Add a build script to `apps/api/package.json`:
```json
"build": "tsc"
```

- [ ] **Step 2: Push repo to GitHub**

```bash
git add render.yaml
git commit -m "chore: add render.yaml for api deployment"
git push -u origin main
```

- [ ] **Step 3: Deploy API to Render**

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect GitHub repo
3. Render detects `render.yaml` automatically — confirm service settings
4. Add all env vars from `apps/api/.env.example` (with real values) — leave `CLIENT_URL` blank for now
5. Deploy → wait for build to complete
6. Note the generated domain (e.g. `caption-aotearoa-api.onrender.com`)

> **Render free tier note:** Service spins down after 15 minutes of inactivity. For the pilot test and grant demo, spin it up manually first by hitting any endpoint. For the showcase (June), upgrade to the $7/mo paid tier or migrate to Railway.

- [ ] **Step 4: Deploy web to Vercel**

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `apps/web`
3. Add env vars:
   - `VITE_API_URL=https://[render-domain]`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
4. Deploy → note Vercel domain (e.g. `caption-aotearoa.vercel.app`)

- [ ] **Step 5: Update CLIENT_URL on Render**

Set `CLIENT_URL` to the Vercel domain in Render's environment variables. Trigger a manual redeploy.

- [ ] **Step 6: Production smoke test**

Repeat Task 19 steps 2–6 against the production URLs. Confirm microphone works (HTTPS is automatic on both Render and Vercel).

- [ ] **Step 7: If Render fails — pivot to Railway**

If Render is causing issues (build failures, WebSocket drops, spin-down during demo):

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Set root directory to `apps/api`
3. Add the same env vars
4. Railway auto-detects Node.js — no config file needed
5. Update `VITE_API_URL` in Vercel to the new Railway domain
6. Update `CLIENT_URL` in Railway to the Vercel domain
7. Redeploy Vercel

- [ ] **Step 8: Final commit and tag**

```bash
git tag mvp-v1.0
git push && git push --tags
```
