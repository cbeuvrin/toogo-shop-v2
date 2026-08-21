import { supabase } from '@/integrations/supabase/client';

// Snapshot del estado VISUAL de la tienda (no toca productos ni pedidos).
// Se toma ANTES de que el Diseñador IA aplique cambios; restaurarlo es el
// botón "Deshacer". Corre en el cliente bajo RLS — el mismo permiso con el
// que el editor visual ya guarda estos datos a mano.

export interface DesignSnapshotPayload {
  settings: Record<string, unknown> | null;
  elements: Array<{ element_type: string; element_id: string; data: unknown }>;
}

const SETTINGS_FIELDS =
  'template_id, primary_color, secondary_color, store_background_color, navbar_bg_color, logo_url';

const KEEP_SNAPSHOTS = 15;

export async function takeDesignSnapshot(tenantId: string, label: string): Promise<string | null> {
  try {
    const [settingsRes, elementsRes] = await Promise.all([
      supabase.from('tenant_settings').select(SETTINGS_FIELDS).eq('tenant_id', tenantId).maybeSingle(),
      supabase.from('visual_editor_data').select('element_type, element_id, data').eq('tenant_id', tenantId),
    ]);
    const payload: DesignSnapshotPayload = {
      settings: settingsRes.data ?? null,
      elements: elementsRes.data ?? [],
    };
    const { data, error } = await supabase
      .from('design_snapshots')
      .insert({ tenant_id: tenantId, label: label.slice(0, 120), payload })
      .select('id')
      .single();
    if (error || !data) {
      console.error('takeDesignSnapshot:', error);
      return null;
    }
    // Poda: conserva solo los últimos KEEP_SNAPSHOTS.
    const { data: old } = await supabase
      .from('design_snapshots')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(KEEP_SNAPSHOTS, KEEP_SNAPSHOTS + 50);
    if (old?.length) {
      await supabase.from('design_snapshots').delete().in('id', old.map((o) => o.id));
    }
    return data.id;
  } catch (e) {
    console.error('takeDesignSnapshot:', e);
    return null;
  }
}

export async function restoreDesignSnapshot(tenantId: string, snapshotId: string): Promise<boolean> {
  try {
    const { data: snap, error } = await supabase
      .from('design_snapshots')
      .select('payload')
      .eq('id', snapshotId)
      .eq('tenant_id', tenantId)
      .single();
    if (error || !snap) return false;
    const p = snap.payload as unknown as DesignSnapshotPayload;

    const ops: PromiseLike<{ error: unknown }>[] = [];
    if (p.settings) {
      ops.push(supabase.from('tenant_settings').update(p.settings).eq('tenant_id', tenantId));
    }
    for (const el of p.elements) {
      ops.push(
        supabase.from('visual_editor_data').upsert(
          { tenant_id: tenantId, element_type: el.element_type, element_id: el.element_id, data: el.data },
          { onConflict: 'tenant_id,element_type,element_id' },
        ),
      );
    }

    // Filas visuales creadas DESPUÉS del snapshot (p. ej. un banner nuevo de
    // la IA) se eliminan para que "deshacer" sea completo. Solo toca
    // visual_editor_data — nunca productos ni pedidos.
    const { data: current } = await supabase
      .from('visual_editor_data')
      .select('element_type, element_id')
      .eq('tenant_id', tenantId);
    const known = new Set(p.elements.map((e) => `${e.element_type}/${e.element_id}`));
    const extras = (current ?? []).filter((r) => !known.has(`${r.element_type}/${r.element_id}`));
    for (const r of extras) {
      ops.push(
        supabase
          .from('visual_editor_data')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('element_type', r.element_type)
          .eq('element_id', r.element_id),
      );
    }

    const results = await Promise.all(ops);
    return results.every((r) => !r.error);
  } catch (e) {
    console.error('restoreDesignSnapshot:', e);
    return false;
  }
}
