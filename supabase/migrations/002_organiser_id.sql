-- Add organiser ownership to events
alter table events add column if not exists organiser_id uuid references auth.users;

-- Index for dashboard queries (list my events)
create index if not exists idx_events_organiser on events(organiser_id);
