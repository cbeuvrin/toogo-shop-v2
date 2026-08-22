import { supabase } from '@/integrations/supabase/client';

// Estructura espejo de ThemeProposal en _shared/designTools.ts (el frontend
// no puede importar desde supabase/functions/) — mantener en sincronía.
export interface ThemeProposal {
  name: string;
  rationale: string;
  templateId: string;
  colors: { primary: string; secondary: string; background: string; navbar: string };
  announcementText?: string;
  tickerText?: string;
}

// Merge sobre visual_editor_data idéntico al del editor: leer, mezclar, upsert
// con el onConflict canónico.
async function mergeVisual(
  tenantId: string,
  elementType: string,
  elementId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { data } = await supabase
    .from('visual_editor_data')
    .select('data')
    .eq('tenant_id', tenantId)
    .eq('element_type', elementType)
    .eq('element_id', elementId)
    .maybeSingle();
  const current = (data?.data as Record<string, unknown>) ?? {};
  const { error } = await supabase.from('visual_editor_data').upsert(
    { tenant_id: tenantId, element_type: elementType, element_id: elementId, data: { ...current, ...patch } },
    { onConflict: 'tenant_id,element_type,element_id' },
  );
  return !error;
}

/** Aplica una propuesta completa. Devuelve false si falló el write principal. */
export async function applyThemeProposal(tenantId: string, p: ThemeProposal): Promise<boolean> {
  const { error } = await supabase
    .from('tenant_settings')
    .update({
      template_id: p.templateId,
      primary_color: p.colors.primary,
      secondary_color: p.colors.secondary,
      store_background_color: p.colors.background,
      navbar_bg_color: p.colors.navbar,
    })
    .eq('tenant_id', tenantId);
  if (error) {
    console.error('applyThemeProposal settings:', error);
    return false;
  }
  if (p.announcementText) {
    await mergeVisual(tenantId, 'announcement', 'top_bar', { text: p.announcementText, enabled: true });
  }
  if (p.tickerText) {
    await mergeVisual(tenantId, 'ticker', 'ticker_bar', { text: p.tickerText, enabled: true });
  }
  return true;
}
