-- Enable RLS on all tables
alter table events enable row level security;
alter table caption_segments enable row level security;
alter table transcripts enable row level security;
alter table transcript_languages enable row level security;

-- Events: anyone can read, organisers can insert/update their own
create policy "events_public_read" on events for select using (true);
create policy "events_organiser_insert" on events for insert with check (auth.uid() = organiser_id);
create policy "events_organiser_update" on events for update using (auth.uid() = organiser_id);

-- Caption segments: service role writes (via API), anyone can read
create policy "segments_public_read" on caption_segments for select using (true);
create policy "segments_service_insert" on caption_segments for insert with check (true);

-- Transcripts: anyone can read, service role writes
create policy "transcripts_public_read" on transcripts for select using (true);
create policy "transcripts_service_insert" on transcripts for insert with check (true);
create policy "transcripts_service_update" on transcripts for update using (true);

-- Transcript languages: anyone can read, service role writes
create policy "transcript_langs_public_read" on transcript_languages for select using (true);
create policy "transcript_langs_service_insert" on transcript_languages for insert with check (true);
