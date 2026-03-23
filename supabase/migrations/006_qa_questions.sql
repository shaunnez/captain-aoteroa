create table if not exists qa_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  body text not null,
  language text not null default 'en',
  translations jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','pinned','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_qa_questions_event on qa_questions(event_id, created_at);
alter table qa_questions enable row level security;
create policy "Anyone can read questions" on qa_questions for select using (true);
create policy "Anyone can submit questions" on qa_questions for insert with check (true);
create policy "Service can update questions" on qa_questions for update using (true);
