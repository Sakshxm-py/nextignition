create table if not exists public.wallet_transactions (
  id uuid primary key,
  user_id uuid not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions (user_id);
create index if not exists wallet_transactions_source_id_idx on public.wallet_transactions ((data->>'sourceId'));
create index if not exists wallet_transactions_entry_kind_idx on public.wallet_transactions ((data->>'entryKind'));
