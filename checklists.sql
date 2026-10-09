create table if not exists public.checklists (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  tipo_veiculo text not null check (tipo_veiculo in ('Carro','Moto')),
  cliente text, whatsapp text, modelo text, placa text, cor text, km text,
  combustivel text, servico text, sujeira text,
  itens jsonb, pertences text, observacoes text, fotos jsonb
);
alter table public.checklists enable row level security;
drop policy if exists "checklists_dono" on public.checklists;
create policy "checklists_dono" on public.checklists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
