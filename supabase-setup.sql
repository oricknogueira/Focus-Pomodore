-- Rode isso no SQL Editor do Supabase (uma vez só)

create table if not exists public.progress (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table public.progress enable row level security;

-- Cada usuário só pode ver/criar/editar a própria linha de progresso
create policy "Users can view own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.progress for update
  using (auth.uid() = user_id);
