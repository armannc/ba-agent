-- Run this in your Supabase SQL editor to set up the database

-- Glossary
create table if not exists glossary (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  definition text not null,
  aliases text[] default '{}',
  category text default 'general',
  created_at timestamptz default now()
);

-- Business Requirements
create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  status text default 'draft' check (status in ('draft','active','implemented','deprecated')),
  priority text default 'medium' check (priority in ('low','medium','high','critical')),
  tags text[] default '{}',
  conflicts text[] default '{}',
  related text[] default '{}',
  metrics text[] default '{}',
  raw_text text,
  analysis jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Meeting Notes
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  raw_text text not null,
  summary text,
  action_items jsonb default '[]',
  linked_requirements text[] default '{}',
  date date default current_date,
  created_at timestamptz default now()
);

-- Chat History (optional persistence)
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  messages jsonb default '[]',
  context_refs jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (adjust as needed for auth)
alter table glossary enable row level security;
alter table requirements enable row level security;
alter table notes enable row level security;
alter table chat_sessions enable row level security;

-- For demo/dev: allow all (replace with proper auth policies in production)
create policy "Allow all for now" on glossary for all using (true);
create policy "Allow all for now" on requirements for all using (true);
create policy "Allow all for now" on notes for all using (true);
create policy "Allow all for now" on chat_sessions for all using (true);
