-- Transcript metadata
create table if not exists transcripts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  generated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_transcripts_event on transcripts(event_id);

-- Transcript content per language
create table if not exists transcript_languages (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references transcripts(id) on delete cascade,
  language text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_transcript_lang on transcript_languages(transcript_id, language);
