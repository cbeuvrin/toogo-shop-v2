# Diseñador IA — Fase 3: Marketplace de temas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El comerciante guarda su look actual como "tema" (privado o público), Carlos modera los públicos en /admin, y cualquier tienda aplica los temas de la comunidad con un click y Deshacer.

**Architecture:** Un tema es datos puros (subset de `ThemeProposal`) en una tabla nueva `design_themes` con RLS. Guardar = capturar client-side el estado actual (tenant_settings + announcement/ticker). Aplicar = el `applyThemeProposal` de F2 + el flujo de snapshot/eventos existente. Moderación vía RPCs SECURITY DEFINER con check `role='superadmin'` (patrón de las promos).

**Tech Stack:** Postgres/RLS + RPCs plpgsql, React + TS + Tailwind + shadcn, supabase-js v2.

**Spec:** `docs/superpowers/specs/2026-08-22-marketplace-temas.md`

**Prerequisito:** F1+F2 mergeadas (o rama que las contenga). Ejecución tras el gate de E2E/copy de F1+F2.

## Global Constraints

- Rama: `feat/disenador-ia-fase3` (desde la rama que contenga F2). Sin merge ni deploy sin OK de Carlos.
- Migraciones: NO usar `npx supabase db push` (roto en este repo). Aplicar vía Management API con el token del CLI en keychain: `TOKEN=$(security find-generic-password -s "Supabase CLI" -w)`, POST `https://api.supabase.com/v1/projects/herqxhfmsstbteahhxpr/database/query` con header `User-Agent: supabase-cli/2.106.0` y body `{"query": <sql>}` (curl, NO urllib). SQL idempotente (`drop policy if exists`, `create or replace function`).
- Literal del rol admin: `'superadmin'` (enum `app_role`; NUNCA `'super_admin'`).
- Upserts a `visual_editor_data`: siempre `onConflict: 'tenant_id,element_type,element_id'` (aquí solo lecturas, pero rige para cualquier write).
- Textos de tema (announcement/ticker) recortados a 120 chars al capturar.
- Copy en español neutro "tú"; decir "tema/estilo/look", NUNCA "plantilla de 0". Strings marcados VALIDAR CON CARLOS.
- Tras la migración: regenerar types (`npx supabase gen types typescript --project-id herqxhfmsstbteahhxpr > src/integrations/supabase/types.ts`) y verificar diff aditivo.
- Commits en español.

---

### Task 1: Migración `design_themes` + RPCs de moderación

**Files:**
- Create: `supabase/migrations/20260822150000_design_themes.sql`
- Modify: `src/integrations/supabase/types.ts` (regenerado)

**Interfaces:**
- Consumes: patrón RPC superadmin de `supabase/migrations/20260728181000_plan_promo_rpcs.sql`.
- Produces: tabla `public.design_themes` (columnas del spec §4) con RLS; RPC `moderate_design_theme(p_theme_id uuid, p_action text) → jsonb {ok, error?}`; RPC `list_pending_design_themes() → setof design_themes`. Los consumen Tasks 2-4.

- [ ] **Step 1: Escribir la migración**

Contenido completo de `supabase/migrations/20260822150000_design_themes.sql`:

```sql
-- Marketplace de temas (Diseñador IA — Fase 3). Un tema = plantilla base +
-- paleta + textos de anuncio/ticker (datos puros, forma StoredTheme). Los
-- públicos requieren aprobación del superadmin (moderación vía RPC).
create table if not exists public.design_themes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  author_name text not null default '',
  name text not null,
  is_public boolean not null default false,
  approved boolean not null default false,
  theme jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.design_themes enable row level security;

-- Lectura: los públicos aprobados son de todos; lo propio siempre.
drop policy if exists "community and own themes readable" on public.design_themes;
create policy "community and own themes readable"
  on public.design_themes for select
  using (
    (is_public and approved)
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_themes.tenant_id
    )
  );

-- Escritura: solo miembros del tenant creador. La aprobación de filas ajenas
-- va por RPC SECURITY DEFINER, nunca por RLS directa.
drop policy if exists "tenant members insert own themes" on public.design_themes;
create policy "tenant members insert own themes"
  on public.design_themes for insert
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_themes.tenant_id
    )
  );

drop policy if exists "tenant members update own themes" on public.design_themes;
create policy "tenant members update own themes"
  on public.design_themes for update
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_themes.tenant_id
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_themes.tenant_id
    )
  );

drop policy if exists "tenant members delete own themes" on public.design_themes;
create policy "tenant members delete own themes"
  on public.design_themes for delete
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.tenant_id = design_themes.tenant_id
    )
  );

create index if not exists design_themes_public_idx
  on public.design_themes (is_public, approved, created_at desc);
create index if not exists design_themes_tenant_idx
  on public.design_themes (tenant_id, created_at desc);

-- Moderación (solo superadmin — literal del enum: 'superadmin').
create or replace function public.moderate_design_theme(p_theme_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_theme public.design_themes;
begin
  if not exists (select 1 from public.user_roles where user_id = v_uid and role = 'superadmin') then
    return jsonb_build_object('ok', false, 'error', 'not_superadmin');
  end if;
  if p_action = 'approve' then
    update public.design_themes set approved = true
      where id = p_theme_id returning * into v_theme;
  elsif p_action = 'reject' then
    -- Rechazar regresa el tema a privado (el autor lo conserva).
    update public.design_themes set is_public = false, approved = false
      where id = p_theme_id returning * into v_theme;
  else
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.list_pending_design_themes()
returns setof public.design_themes
language sql
security definer
set search_path = public
as $$
  select t.*
  from public.design_themes t
  where t.is_public = true
    and t.approved = false
    and exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'superadmin'
    )
  order by t.created_at asc;
$$;

grant execute on function public.moderate_design_theme(uuid, text) to authenticated;
grant execute on function public.list_pending_design_themes() to authenticated;
```

- [ ] **Step 2: Aplicar vía Management API**

```bash
cd "/Users/carlosbeuvrin/Documents/KETING MEDIA/NUEVOS PROYECTOS ANTIGRAVITY/TOOGO 4 claude + 10 plantillas/toogo-shop-builder-main"
TOKEN=$(security find-generic-password -s "Supabase CLI" -w)
python3 -c "import json; open('/tmp/f3mig.json','w').write(json.dumps({'query': open('supabase/migrations/20260822150000_design_themes.sql').read()}))"
curl -s -w "\nHTTP %{http_code}\n" -X POST "https://api.supabase.com/v1/projects/herqxhfmsstbteahhxpr/database/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "User-Agent: supabase-cli/2.106.0" --data @/tmp/f3mig.json | tail -2
rm -f /tmp/f3mig.json
```
Expected: `[]` + `HTTP 201`.

- [ ] **Step 3: Verificar tabla, RLS, políticas y funciones**

Mismo endpoint con:
```json
{"query":"select (select relrowsecurity from pg_class where relname='design_themes') as rls, (select count(*) from pg_policies where tablename='design_themes') as policies, (select count(*) from pg_proc where proname in ('moderate_design_theme','list_pending_design_themes')) as fns"}
```
Expected: `[{"rls":true,"policies":4,"fns":2}]`.

- [ ] **Step 4: Regenerar types y verificar diff aditivo**

```bash
npx supabase gen types typescript --project-id herqxhfmsstbteahhxpr > src/integrations/supabase/types.ts
git diff --stat src/integrations/supabase/types.ts
```
Expected: solo inserciones (bloques `design_themes`, `moderate_design_theme`, `list_pending_design_themes`). Si el diff borra tablas existentes: `git checkout -- src/integrations/supabase/types.ts` y reportar BLOCKED.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260822150000_design_themes.sql src/integrations/supabase/types.ts
git commit -m "feat(temas): tabla design_themes con RLS + RPCs de moderación"
```

---

### Task 2: Librería client-side `designThemes.ts`

**Files:**
- Create: `src/lib/designThemes.ts`

**Interfaces:**
- Consumes: `applyThemeProposal`/`ThemeProposal` (`src/lib/applyThemeProposal.ts`), `takeDesignSnapshot`/`setPendingSnapshot` (`src/lib/designSnapshots.ts`), tabla/RPCs de Task 1, `useTenantContext` NO (recibe tenantId por parámetro).
- Produces (los consumen Tasks 3-4):
  - `interface StoredTheme { templateId: string; colors: { primary: string; secondary: string; background: string; navbar: string }; announcementText?: string; tickerText?: string }`
  - `interface DesignThemeRow { id: string; tenant_id: string; author_name: string; name: string; is_public: boolean; approved: boolean; theme: StoredTheme; created_at: string }`
  - `captureCurrentTheme(tenantId: string): Promise<StoredTheme | null>`
  - `saveTheme(tenantId: string, authorName: string, name: string, isPublic: boolean): Promise<boolean>`
  - `listMyThemes(tenantId: string): Promise<DesignThemeRow[]>`
  - `listCommunityThemes(): Promise<DesignThemeRow[]>`
  - `deleteTheme(themeId: string): Promise<boolean>`
  - `applyStoredTheme(tenantId: string, row: DesignThemeRow): Promise<boolean>` — con snapshot + singleton + eventos (mismo contrato del wizard).

- [ ] **Step 1: Escribir el módulo**

Contenido completo de `src/lib/designThemes.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';
import { applyThemeProposal, type ThemeProposal } from '@/lib/applyThemeProposal';
import { setPendingSnapshot, takeDesignSnapshot } from '@/lib/designSnapshots';

// Marketplace de temas (Fase 3). Un tema guardado es el subset de
// ThemeProposal que applyThemeProposal sabe aplicar; el nombre y el autor
// viven en columnas de design_themes, no dentro del JSON.

export interface StoredTheme {
  templateId: string;
  colors: { primary: string; secondary: string; background: string; navbar: string };
  announcementText?: string;
  tickerText?: string;
}

export interface DesignThemeRow {
  id: string;
  tenant_id: string;
  author_name: string;
  name: string;
  is_public: boolean;
  approved: boolean;
  theme: StoredTheme;
  created_at: string;
}

// Fallbacks solo para colores AUSENTES en tenant_settings (paleta de marca).
const FALLBACK_COLORS = {
  primary: '#8346C1',
  secondary: '#6E38A6',
  background: '#FFFFFF',
  navbar: '#FFFFFF',
};

const MAX_TEXT = 120; // mismo tope que valida el servidor en Fase 2

async function readElementText(
  tenantId: string,
  elementType: string,
  elementId: string,
): Promise<string | undefined> {
  const { data } = await supabase
    .from('visual_editor_data')
    .select('data')
    .eq('tenant_id', tenantId)
    .eq('element_type', elementType)
    .eq('element_id', elementId)
    .maybeSingle();
  const d = (data?.data ?? {}) as { text?: unknown; enabled?: unknown };
  if (d.enabled === false) return undefined;
  const text = typeof d.text === 'string' ? d.text.trim() : '';
  return text ? text.slice(0, MAX_TEXT) : undefined;
}

/** Captura el look ACTUAL de la tienda como StoredTheme. null si no hay settings. */
export async function captureCurrentTheme(tenantId: string): Promise<StoredTheme | null> {
  const { data: settings, error } = await supabase
    .from('tenant_settings')
    .select('template_id, primary_color, secondary_color, store_background_color, navbar_bg_color')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error || !settings) {
    console.error('captureCurrentTheme:', error);
    return null;
  }
  const [announcementText, tickerText] = await Promise.all([
    readElementText(tenantId, 'announcement', 'top_bar'),
    readElementText(tenantId, 'ticker', 'ticker_bar'),
  ]);
  return {
    templateId: settings.template_id || 'default',
    colors: {
      primary: settings.primary_color || FALLBACK_COLORS.primary,
      secondary: settings.secondary_color || FALLBACK_COLORS.secondary,
      background: settings.store_background_color || FALLBACK_COLORS.background,
      navbar: settings.navbar_bg_color || FALLBACK_COLORS.navbar,
    },
    ...(announcementText ? { announcementText } : {}),
    ...(tickerText ? { tickerText } : {}),
  };
}

export async function saveTheme(
  tenantId: string,
  authorName: string,
  name: string,
  isPublic: boolean,
): Promise<boolean> {
  const theme = await captureCurrentTheme(tenantId);
  if (!theme) return false;
  const { error } = await supabase.from('design_themes').insert({
    tenant_id: tenantId,
    author_name: authorName.slice(0, 80),
    name: name.trim().slice(0, 80),
    is_public: isPublic,
    approved: false, // los públicos esperan aprobación del superadmin
    theme,
  });
  if (error) console.error('saveTheme:', error);
  return !error;
}

export async function listMyThemes(tenantId: string): Promise<DesignThemeRow[]> {
  const { data, error } = await supabase
    .from('design_themes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) console.error('listMyThemes:', error);
  return (data as unknown as DesignThemeRow[]) ?? [];
}

export async function listCommunityThemes(): Promise<DesignThemeRow[]> {
  const { data, error } = await supabase
    .from('design_themes')
    .select('*')
    .eq('is_public', true)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) console.error('listCommunityThemes:', error);
  return (data as unknown as DesignThemeRow[]) ?? [];
}

export async function deleteTheme(themeId: string): Promise<boolean> {
  const { error } = await supabase.from('design_themes').delete().eq('id', themeId);
  if (error) console.error('deleteTheme:', error);
  return !error;
}

/**
 * Aplica un tema (propio o de la comunidad) con el MISMO contrato del wizard:
 * snapshot previo → singleton + evento (el Deshacer del Diseñador IA lo
 * cubre) → applyThemeProposal → evento de refresco.
 */
export async function applyStoredTheme(tenantId: string, row: DesignThemeRow): Promise<boolean> {
  const snapId = await takeDesignSnapshot(tenantId, `antes del tema "${row.name}"`);
  if (snapId) {
    setPendingSnapshot(snapId);
    window.dispatchEvent(new CustomEvent('toogo:design-snapshot', { detail: { id: snapId } }));
  }
  const proposal: ThemeProposal = {
    name: row.name,
    rationale: row.author_name ? `Tema de ${row.author_name}` : 'Tema guardado',
    templateId: row.theme.templateId,
    colors: row.theme.colors,
    ...(row.theme.announcementText ? { announcementText: row.theme.announcementText } : {}),
    ...(row.theme.tickerText ? { tickerText: row.theme.tickerText } : {}),
  };
  const ok = await applyThemeProposal(tenantId, proposal);
  if (ok) window.dispatchEvent(new CustomEvent('toogo:design-updated'));
  return ok;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/designThemes.ts
git commit -m "feat(temas): librería client-side de captura, guardado y aplicación de temas"
```

---

### Task 3: UI — `ThemesPanel` en la galería de plantillas

**Files:**
- Create: `src/components/dashboard3/ThemesPanel.tsx`
- Modify: `src/components/dashboard3/TemplateSelector.tsx` (2 líneas: import + render)

**Interfaces:**
- Consumes: todo Task 2; `useTenantContext` (`currentTenantId`, `availableTenants` para `author_name` = nombre del tenant); `TEMPLATES` de `@/lib/templatesCatalog` (thumbnail por templateId); ui `Dialog`, `Button`, `Input` (verificados: existen en `src/components/ui/`). El toggle de publicar usa un checkbox nativo con `accent-violet-600` (decisión del plan: más simple que Switch para una sola opción).
- Produces: `<ThemesPanel />` sin props, renderizado al final de la sub-pestaña de galería.

Copy visible (VALIDAR CON CARLOS): "💾 Guardar mi tema", "Guarda el look actual de tu tienda para volver a él cuando quieras — o publícalo para la comunidad.", "Nombre del tema", "Publicarlo para la comunidad (lo revisamos antes de que aparezca)", "Mis temas", "Temas de la comunidad", "Aplicar a mi tienda", badges "Privado"/"En revisión"/"Publicado", "Tema aplicado. Puedes deshacerlo desde el Diseñador IA.", "Tema guardado", "Tema publicado para revisión".

- [ ] **Step 1: Escribir el componente**

Contenido completo de `src/components/dashboard3/ThemesPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TEMPLATES } from '@/lib/templatesCatalog';
import {
  applyStoredTheme,
  deleteTheme,
  listCommunityThemes,
  listMyThemes,
  saveTheme,
  type DesignThemeRow,
} from '@/lib/designThemes';

// Marketplace de temas dentro de la galería de plantillas: guardar el look
// actual (privado o para la comunidad) y aplicar temas propios o públicos.

const badgeFor = (t: DesignThemeRow) =>
  !t.is_public
    ? { label: 'Privado', cls: 'bg-gray-100 text-gray-600' }
    : t.approved
      ? { label: 'Publicado', cls: 'bg-green-100 text-green-700' }
      : { label: 'En revisión', cls: 'bg-amber-100 text-amber-700' };

const ThemeCard = ({
  row,
  onApply,
  onDelete,
  applying,
}: {
  row: DesignThemeRow;
  onApply: (row: DesignThemeRow) => void;
  onDelete?: (row: DesignThemeRow) => void;
  applying: boolean;
}) => {
  const tpl = TEMPLATES.find((t) => t.id === row.theme.templateId);
  const badge = badgeFor(row);
  const chips = [row.theme.colors.primary, row.theme.colors.secondary, row.theme.colors.background, row.theme.colors.navbar];
  return (
    <div className="rounded-xl border bg-white p-3">
      {tpl?.thumbnail && (
        <img src={tpl.thumbnail} alt={tpl.name} className="mb-2 h-20 w-full rounded-lg object-cover object-top" />
      )}
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate font-semibold">{row.name}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
      </div>
      <p className="mb-2 truncate text-xs text-gray-500">
        Base {tpl?.name ?? row.theme.templateId}
        {row.author_name ? ` · por ${row.author_name}` : ''}
      </p>
      <div className="mb-3 flex gap-1.5">
        {chips.map((c, i) => (
          <span key={i} className="h-5 w-5 rounded-full border" style={{ backgroundColor: c }} title={c} />
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={applying} onClick={() => onApply(row)}>
          Aplicar a mi tienda
        </Button>
        {onDelete && (
          <Button size="sm" variant="outline" disabled={applying} onClick={() => onDelete(row)}>
            🗑
          </Button>
        )}
      </div>
    </div>
  );
};

export const ThemesPanel = () => {
  const { currentTenantId: tenantId, availableTenants } = useTenantContext();
  const { loadSettings } = useTenantSettings();
  const { toast } = useToast();
  const [mine, setMine] = useState<DesignThemeRow[]>([]);
  const [community, setCommunity] = useState<DesignThemeRow[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);

  const authorName = availableTenants.find((t) => t.id === tenantId)?.name ?? '';

  const refresh = async () => {
    if (!tenantId) return;
    const [m, c] = await Promise.all([listMyThemes(tenantId), listCommunityThemes()]);
    setMine(m);
    setCommunity(c);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const onSave = async () => {
    if (!tenantId || !name.trim() || busy) return;
    setBusy(true);
    const ok = await saveTheme(tenantId, authorName, name, isPublic);
    setBusy(false);
    if (ok) {
      toast({ title: isPublic ? 'Tema publicado para revisión' : 'Tema guardado' });
      setSaveOpen(false);
      setName('');
      setIsPublic(false);
      await refresh();
    } else {
      toast({ title: 'No se pudo guardar el tema', variant: 'destructive' });
    }
  };

  const onApply = async (row: DesignThemeRow) => {
    if (!tenantId || busy) return;
    setBusy(true);
    const ok = await applyStoredTheme(tenantId, row);
    setBusy(false);
    if (ok) {
      await loadSettings();
      toast({ title: 'Tema aplicado', description: 'Puedes deshacerlo desde el Diseñador IA.' });
    } else {
      toast({ title: 'No se pudo aplicar el tema', variant: 'destructive' });
    }
  };

  const onDelete = async (row: DesignThemeRow) => {
    if (busy) return;
    setBusy(true);
    const ok = await deleteTheme(row.id);
    setBusy(false);
    if (ok) {
      toast({ title: 'Tema eliminado' });
      await refresh();
    } else {
      toast({ title: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  if (!tenantId) return null;

  return (
    <div className="mt-8 space-y-6">
      {/* Guardar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-violet-50 p-4">
        <p className="text-sm text-violet-900">
          Guarda el look actual de tu tienda para volver a él cuando quieras — o publícalo para la comunidad.
        </p>
        <Button onClick={() => setSaveOpen(true)}>💾 Guardar mi tema</Button>
      </div>

      {mine.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">Mis temas</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mine.map((row) => (
              <ThemeCard key={row.id} row={row} onApply={onApply} onDelete={onDelete} applying={busy} />
            ))}
          </div>
        </div>
      )}

      {community.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">Temas de la comunidad</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {community.map((row) => (
              <ThemeCard key={row.id} row={row} onApply={onApply} applying={busy} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>💾 Guardar mi tema</DialogTitle>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Nombre del tema (ej. "Elegante Nocturno")'
            maxLength={80}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 accent-violet-600"
            />
            Publicarlo para la comunidad (lo revisamos antes de que aparezca)
          </label>
          <Button onClick={onSave} disabled={busy || !name.trim()} className="w-full">
            {busy ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

- [ ] **Step 2: Integrar en `TemplateSelector`**

1. Junto al import de `DesignWizard`:
```tsx
import { ThemesPanel } from './ThemesPanel';
```
2. En el JSX, inmediatamente DESPUÉS del `</div>` que cierra el grid de `TEMPLATES.map(...)` (ancla: el `</div>` previo al `<Dialog open={isConfirmOpen}`):
```tsx
            <ThemesPanel />
```

- [ ] **Step 3: Build + verificación**

```bash
npm run build && grep -n "ThemesPanel" src/components/dashboard3/TemplateSelector.tsx
```
Expected: `✓ built`; grep muestra import + render.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard3/ThemesPanel.tsx src/components/dashboard3/TemplateSelector.tsx
git commit -m "feat(temas): guardar mi tema + Mis temas + Temas de la comunidad en la galería"
```

---

### Task 4: Pestaña "Temas" en /admin (moderación)

**Files:**
- Create: `src/components/admin/DesignThemesAdmin.tsx`
- Modify: `src/pages/Admin.tsx` (import + TabsTrigger + TabsContent + grid-cols)

**Interfaces:**
- Consumes: RPCs `list_pending_design_themes()` y `moderate_design_theme(p_theme_id, p_action)` (Task 1); `TEMPLATES` para nombre de base; patrón visual de `src/components/admin/PlanPromoAdmin.tsx`.
- Produces: `<DesignThemesAdmin />` en la pestaña `value="temas"` de /admin.

- [ ] **Step 1: Escribir el componente**

Contenido completo de `src/components/admin/DesignThemesAdmin.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TEMPLATES } from '@/lib/templatesCatalog';
import type { DesignThemeRow } from '@/lib/designThemes';

// Moderación del marketplace de temas: los temas publicados esperan aquí
// hasta que el superadmin los apruebe (aparecen en la comunidad) o los
// rechace (vuelven a privados del autor).
export const DesignThemesAdmin = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<DesignThemeRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    const { data, error } = await supabase.rpc('list_pending_design_themes');
    if (error) {
      console.error('list_pending_design_themes:', error);
      toast({ title: 'No pude cargar los temas pendientes', variant: 'destructive' });
      return;
    }
    setPending((data as unknown as DesignThemeRow[]) ?? []);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moderate = async (row: DesignThemeRow, action: 'approve' | 'reject') => {
    if (busy) return;
    setBusy(row.id);
    const { data, error } = await supabase.rpc('moderate_design_theme', {
      p_theme_id: row.id,
      p_action: action,
    });
    setBusy(null);
    const ok = !error && (data as { ok?: boolean })?.ok;
    if (ok) {
      toast({ title: action === 'approve' ? 'Tema aprobado' : 'Tema rechazado (vuelve a privado)' });
      await refresh();
    } else {
      console.error('moderate_design_theme:', error ?? data);
      toast({ title: 'No se pudo moderar el tema', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temas pendientes de revisión ({pending.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay temas esperando revisión.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((row) => {
              const tpl = TEMPLATES.find((t) => t.id === row.theme.templateId);
              return (
                <div key={row.id} className="rounded-xl border p-4">
                  <p className="font-semibold">{row.name}</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    por {row.author_name || 'sin nombre'} · base {tpl?.name ?? row.theme.templateId}
                  </p>
                  <div className="mb-2 flex gap-1.5">
                    {[row.theme.colors.primary, row.theme.colors.secondary, row.theme.colors.background, row.theme.colors.navbar].map((c, i) => (
                      <span key={i} className="h-5 w-5 rounded-full border" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                  {(row.theme.announcementText || row.theme.tickerText) && (
                    <div className="mb-3 space-y-1 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                      {row.theme.announcementText && <p>📢 {row.theme.announcementText}</p>}
                      {row.theme.tickerText && <p>〰️ {row.theme.tickerText}</p>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" disabled={busy === row.id} onClick={() => moderate(row, 'approve')}>
                      Aprobar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" disabled={busy === row.id} onClick={() => moderate(row, 'reject')}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: Integrar en `Admin.tsx`**

1. Junto al import de `PlanPromoAdmin` (línea ~15):
```tsx
import { DesignThemesAdmin } from '@/components/admin/DesignThemesAdmin';
```
2. Ancla `<TabsList className="inline-flex w-full md:grid md:grid-cols-10 overflow-x-auto">` (línea ~130): cambiar `md:grid-cols-10` → `md:grid-cols-11`.
3. Inmediatamente después del `</TabsTrigger>` del trigger `value="promo"` (línea ~167-169), agregar:
```tsx
            <TabsTrigger value="temas" className="flex items-center gap-2">
              🎨 Temas
            </TabsTrigger>
```
(Si los demás triggers usan íconos de lucide + texto, imitar el patrón con el ícono `Palette` importado de lucide-react en lugar del emoji.)
4. Después del `</TabsContent>` de `value="promo"` (línea ~211+), agregar:
```tsx
          <TabsContent value="temas" className="space-y-6">
            <DesignThemesAdmin />
          </TabsContent>
```

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/DesignThemesAdmin.tsx src/pages/Admin.tsx
git commit -m "feat(temas): pestaña de moderación de temas en /admin"
```

---

### Task 5: E2E humano (Carlos + controlador) y gate de copy

**Files:** ninguno.

- [ ] **Step 1: Checklist E2E** (con la tienda de prueba y una segunda cuenta/tenant)

1. Galería → "💾 Guardar mi tema" privado → aparece en "Mis temas" con badge Privado.
2. Cambiar el look de la tienda (chat o manual) → aplicar el tema guardado → la tienda regresa al look guardado; el Deshacer del Diseñador IA aparece y funciona.
3. Guardar otro tema con "publicarlo" → badge "En revisión"; NO aparece en comunidad.
4. /admin → pestaña Temas → se ve con autor, colores y textos → Aprobar → aparece en "Temas de la comunidad".
5. Con la segunda cuenta (otro tenant): ve el tema en comunidad (con autor), lo aplica, su Deshacer funciona; NO ve los temas privados del primero.
6. Rechazar un pendiente → desaparece de la cola y en el autor vuelve a badge Privado.
7. Eliminar un tema propio → desaparece.

- [ ] **Step 2: Gate de copy**

Presentar a Carlos todos los strings de Task 3/4 (marcados VALIDAR) + recordatorio: "tema/estilo", nunca "plantilla de 0".

- [ ] **Step 3: Push de la rama (sin merge)**

```bash
git push -u origin feat/disenador-ia-fase3
```
