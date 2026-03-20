-- Events table
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'ended')),
  event_date timestamptz,
  languages text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Caption segments table
create table if not exists caption_segments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  sequence integer not null,
  text text not null,
  language text not null,
  is_final boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_segments_event_seq on caption_segments(event_id, sequence desc);
create index if not exists idx_segments_event_lang on caption_segments(event_id, language);
