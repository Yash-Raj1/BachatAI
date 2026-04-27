create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  monthly_income numeric,
  savings_goal numeric,
  risk_appetite text check (risk_appetite in ('low', 'medium', 'high')),
  preferred_language text default 'en',
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
