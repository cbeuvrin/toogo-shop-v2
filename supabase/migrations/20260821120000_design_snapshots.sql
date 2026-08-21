-- Snapshots del estado visual de una tienda para el botón "Deshacer" del
-- Diseñador IA. payload = { settings: {...tenant_settings visual...},
-- elements: [{element_type, element_id, data}] }.
create table if not exists public.design_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null default '',
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.design_snapshots enable row level security;

-- Mismo criterio de acceso que ya usa el editor visual: cualquier usuario con
-- un rol en el tenant puede leer/escribir sus snapshots.
create policy "tenant members manage design snapshots"
  on public.design_snapshots
  for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_snapshots.tenant_id
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_snapshots.tenant_id
    )
  );

create index if not exists design_snapshots_tenant_created_idx
  on public.design_snapshots (tenant_id, created_at desc);
