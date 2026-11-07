-- Pegá TODO esto en Supabase > SQL Editor > New query > Run (una sola vez)

create table if not exists public.items (
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

alter table public.items enable row level security;

-- Acceso abierto (sin inicio de sesión): quien tenga la dirección de la app puede leer y escribir
create policy "bronda items abierto" on public.items
  for all to anon, authenticated using (true) with check (true);

-- Sincronización en vivo
alter publication supabase_realtime add table public.items;

-- Carpeta de archivos (PDFs y fotos)
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

create policy "bronda assets subir" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'assets');
create policy "bronda assets editar" on storage.objects
  for update to anon, authenticated using (bucket_id = 'assets');
create policy "bronda assets borrar" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'assets');
