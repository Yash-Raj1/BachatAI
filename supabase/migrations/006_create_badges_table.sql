create table if not exists badges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  badge_type text not null,
  badge_name text not null,
  earned_at timestamptz default now()
);

alter table badges enable row level security;
create policy "Users can only access own badges" on badges for all using (auth.uid() = user_id);
