create table if not exists statements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  file_name text not null,
  file_url text,
  bank_name text,
  statement_period_start date,
  statement_period_end date,
  total_credit numeric,
  total_debit numeric,
  parsed_at timestamptz default now()
);

alter table statements enable row level security;
create policy "Users can only access own statements" on statements for all using (auth.uid() = user_id);
