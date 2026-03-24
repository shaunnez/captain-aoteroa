-- Optimize transcript storage: store all language variants in a single JSONB column
-- per sequence instead of one row per language. Reduces row count by N× (where N = languages).

-- Add JSONB column for multi-language segments (locale → text)
alter table caption_segments add column if not exists segments jsonb;

-- Migrate existing rows: group by (event_id, sequence) and merge into JSONB.
-- Keep the first row per (event_id, sequence) and aggregate languages into segments.
update caption_segments c
set segments = sub.merged
from (
  select event_id, sequence, jsonb_object_agg(language, text) as merged
  from caption_segments
  where is_final = true
  group by event_id, sequence
) sub
where c.event_id = sub.event_id
  and c.sequence = sub.sequence;

-- Delete duplicate rows per (event_id, sequence), keeping only the earliest (by created_at)
delete from caption_segments
where id not in (
  select distinct on (event_id, sequence) id
  from caption_segments
  order by event_id, sequence, created_at asc
);

-- Add unique constraint so we can upsert (one row per event+sequence)
create unique index if not exists idx_segments_event_seq_unique
  on caption_segments(event_id, sequence);

-- Create GIN index on segments JSONB for efficient key lookups
create index if not exists idx_segments_jsonb on caption_segments using gin (segments);
