create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  statement_id uuid references statements(id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric not null,
  type text check (type in ('credit', 'debit')),
  category text,
  subcategory text,
  is_anomaly boolean default false,
  created_at timestamptz default now()
);

alter table transactions enable row level security;
create policy "Users can only access own transactions" on transactions for all using (auth.uid() = user_id);
