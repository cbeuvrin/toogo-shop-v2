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
  heroTitleFont?: string;
  heroTitleColor?: string;
  sectionBackgrounds?: { hero?: string; section1?: string; section2?: string; footer?: string };
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
  // Tipografía/color del título y fondos por sección: misma semántica que el
  // editor (handleSaveHeroElement / handleSaveSectionBg): merge de
  // hero/main_hero sin pisar el resto; el TEXTO top-level no se toca.
  if (p.heroTitleFont || p.heroTitleColor || p.sectionBackgrounds) {
    const { data } = await supabase
      .from('visual_editor_data')
      .select('data')
      .eq('tenant_id', tenantId)
      .eq('element_type', 'hero')
      .eq('element_id', 'main_hero')
      .maybeSingle();
    const current = (data?.data as Record<string, unknown>) ?? {};
    const styles = (current.styles as Record<string, Record<string, unknown>>) ?? {};
    const title = {
      ...(styles.title ?? {}),
      ...(p.heroTitleFont ? { fontFamily: p.heroTitleFont } : {}),
      ...(p.heroTitleColor ? { color: p.heroTitleColor } : {}),
    };
    const cleanBgs = Object.fromEntries(
      Object.entries(p.sectionBackgrounds ?? {}).filter(([, v]) => typeof v === 'string'),
    );
    const merged = {
      ...current,
      styles: { ...styles, title },
      sectionBg: { ...((current.sectionBg as Record<string, unknown>) ?? {}), ...cleanBgs },
    };
    await supabase.from('visual_editor_data').upsert(
      { tenant_id: tenantId, element_type: 'hero', element_id: 'main_hero', data: merged },
      { onConflict: 'tenant_id,element_type,element_id' },
    );
  }
  return true;
}
