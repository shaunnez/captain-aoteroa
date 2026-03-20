-- Custom phrase hints for speech recognition (te reo words, event-specific terms)
alter table events add column if not exists phrase_list text[] not null default '{}';
