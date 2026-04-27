create table if not exists forecasts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  forecast_date date not null,
  predicted_savings numeric,
  predicted_expenses numeric,
  confidence_lower numeric,
  confidence_upper numeric,
  model_used text,
  created_at timestamptz default now()
);

alter table forecasts enable row level security;
create policy "Users can only access own forecasts" on forecasts for all using (auth.uid() = user_id);
