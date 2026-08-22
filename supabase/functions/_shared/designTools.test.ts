// deno test supabase/functions/_shared/designTools.test.ts
// Sin dependencias externas: asserts propios + mock del cliente Supabase.
import {
  DESIGN_TOOLS,
  executeDesignTool,
  isDesignTool,
  TEMPLATE_IDS,
  validateThemeProposal,
} from './designTools.ts';

function assertEq(actual: unknown, expected: unknown, msg: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg}\n  actual:   ${a}\n  expected: ${b}`);
}
function assertTrue(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// Mock mínimo del query builder de supabase-js. Estado en memoria:
// state.settings = fila de tenant_settings; state.elements = mapa
// "element_type/element_id" -> data. Registra cada escritura en `writes`.
function makeMock(state: { settings?: any; elements?: Record<string, any> }) {
  const writes: any[] = [];
  function from(table: string) {
    const q: any = { _table: table, _filters: {} as Record<string, any>, _op: 'select' };
    q.select = () => q;
    q.eq = (col: string, val: any) => { q._filters[col] = val; return q; };
    q.update = (payload: any) => { q._op = 'update'; q._payload = payload; return q; };
    q.upsert = (payload: any, opts: any) => {
      q._op = 'upsert';
      writes.push({ table, op: 'upsert', payload, opts });
      return q;
    };
    q.single = async () => ({
      data: table === 'tenant_settings' ? (state.settings ?? null) : null,
      error: null,
    });
    q.maybeSingle = async () => {
      const key = `${q._filters['element_type']}/${q._filters['element_id']}`;
      const d = state.elements?.[key];
      return { data: d !== undefined ? { data: d } : null, error: null };
    };
    // Terminador implícito (await sobre el builder): update o select-lista.
    q.then = (resolve: any, reject: any) => {
      if (q._op === 'update') {
        writes.push({ table, op: 'update', payload: q._payload, filters: { ...q._filters } });
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
      if (q._op === 'upsert') {
        return Promise.resolve({ error: null }).then(resolve, reject);
      }
      const rows = Object.entries(state.elements ?? {}).map(([k, v]) => {
        const [t, ...rest] = k.split('/');
        return { element_type: t, element_id: rest.join('/'), data: v };
      });
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    };
    return q;
  }
  return { client: { from }, writes };
}

Deno.test('DESIGN_TOOLS: nombres únicos y schema completo', () => {
  const names = DESIGN_TOOLS.map((t: any) => t.function.name);
  assertEq(names.length, new Set(names).size, 'hay nombres de tool duplicados');
  for (const t of DESIGN_TOOLS as any[]) {
    assertTrue(t.type === 'function', `tool sin type function: ${t.function?.name}`);
    assertTrue(t.function.description?.length > 10, `descripción pobre en ${t.function.name}`);
    assertEq(t.function.parameters.type, 'object', `parameters.type debe ser object en ${t.function.name}`);
    assertTrue(isDesignTool(t.function.name), `isDesignTool no reconoce ${t.function.name}`);
  }
  assertTrue(!isDesignTool('update_product'), 'isDesignTool no debe capturar tools del agente base');
});

Deno.test('set_template: rechaza id inválido sin escribir', async () => {
  const { client, writes } = makeMock({});
  const r = await executeDesignTool(client, 't1', 'set_template', { templateId: 'no_existe' });
  assertEq(r.success, false, 'debió fallar');
  assertEq(writes.length, 0, 'no debió escribir nada');
});

Deno.test('set_template: id válido actualiza tenant_settings.template_id', async () => {
  const { client, writes } = makeMock({});
  const r = await executeDesignTool(client, 't1', 'set_template', { templateId: 'trendy_fashion' });
  assertEq(r.success, true, 'debió aplicar');
  assertEq(writes[0].table, 'tenant_settings', 'tabla equivocada');
  assertEq(writes[0].payload, { template_id: 'trendy_fashion' }, 'payload equivocado');
  assertEq(writes[0].filters, { tenant_id: 't1' }, 'debe filtrar por tenant');
  assertTrue(TEMPLATE_IDS.includes('trendy_fashion' as any), 'catálogo desalineado');
});

Deno.test('update_ticker: hace MERGE con lo existente y usa el par canónico', async () => {
  const { client, writes } = makeMock({
    elements: { 'ticker/ticker_bar': { text: 'Hola', enabled: true } },
  });
  const r = await executeDesignTool(client, 't1', 'update_ticker', { bgColor: '#000000' });
  assertEq(r.success, true, 'debió aplicar');
  const w = writes[0];
  assertEq(w.payload.element_type, 'ticker', 'element_type');
  assertEq(w.payload.element_id, 'ticker_bar', 'element_id');
  assertEq(w.opts, { onConflict: 'tenant_id,element_type,element_id' }, 'onConflict obligatorio');
  assertEq(w.payload.data, { text: 'Hola', enabled: true, bgColor: '#000000' }, 'merge perdió campos');
});

Deno.test('update_announcement: color inválido se rechaza sin escribir', async () => {
  const { client, writes } = makeMock({});
  const r = await executeDesignTool(client, 't1', 'update_announcement', { bgColor: 'rojo' });
  assertEq(r.success, false, 'debió rechazar');
  assertEq(writes.length, 0, 'no debió escribir');
});

Deno.test('update_hero_text: nodo principal → texto top-level + estilo en styles', async () => {
  const { client, writes } = makeMock({
    elements: { 'hero/main_hero': { title: 'Viejo', styles: { title: { fontSize: 40 } } } },
  });
  const r = await executeDesignTool(client, 't1', 'update_hero_text', {
    element: 'title', text: 'Nuevo título', color: '#FFD700', fontFamily: 'playfair',
  });
  assertEq(r.success, true, 'debió aplicar');
  const d = writes[0].payload.data;
  assertEq(d.title, 'Nuevo título', 'el texto de title vive top-level');
  assertEq(d.styles.title, { fontSize: 40, color: '#FFD700', fontFamily: 'playfair' }, 'estilo mal mergeado');
  assertTrue(d.styles.title.text === undefined, 'title NO guarda text dentro de styles');
});

Deno.test('update_hero_text: nodo secundario guarda el texto DENTRO de styles', async () => {
  const { client, writes } = makeMock({ elements: {} });
  const r = await executeDesignTool(client, 't1', 'update_hero_text', {
    element: 'sectionTitle1', text: 'Recién llegados', color: '#111111',
  });
  assertEq(r.success, true, 'debió aplicar');
  const d = writes[0].payload.data;
  assertEq(d.styles.sectionTitle1.text, 'Recién llegados', 'texto secundario va en styles[key].text');
  assertTrue(d.sectionTitle1 === undefined, 'no debe crear campo top-level');
});

Deno.test('set_section_background: mergea sectionBg sin pisar otras secciones', async () => {
  const { client, writes } = makeMock({
    elements: { 'hero/main_hero': { sectionBg: { hero: '#FFFFFF' } } },
  });
  const r = await executeDesignTool(client, 't1', 'set_section_background', {
    section: 'footer', bgColor: '#101010',
  });
  assertEq(r.success, true, 'debió aplicar');
  assertEq(writes[0].payload.data.sectionBg, { hero: '#FFFFFF', footer: '#101010' }, 'merge de sectionBg');
});

Deno.test('set_section_background: "default" limpia el override (null)', async () => {
  const { client, writes } = makeMock({
    elements: { 'hero/main_hero': { sectionBg: { footer: '#101010' } } },
  });
  await executeDesignTool(client, 't1', 'set_section_background', { section: 'footer', bgColor: 'default' });
  assertEq(writes[0].payload.data.sectionBg, { footer: null }, 'default debe traducirse a null');
});

Deno.test('get_design_state: resume plantilla + elementos', async () => {
  const { client } = makeMock({
    settings: { template_id: 'nature', primary_color: '#3F5D3A' },
    elements: {
      'ticker/ticker_bar': { text: 'Envío gratis', enabled: true },
      'banner/banner_1': { imageUrl: 'x.webp', sort: 0 },
    },
  });
  const r = await executeDesignTool(client, 't1', 'get_design_state', {});
  assertEq(r.template.id, 'nature', 'template id');
  assertEq(r.template.nombre, 'Nature & Earth', 'template nombre');
  assertEq(r.ticker, { text: 'Envío gratis', enabled: true }, 'ticker');
  assertEq(r.banners, [{ id: 'banner_1', sort: 0, imageUrl: 'x.webp' }], 'banners');
});

Deno.test('validateThemeProposal: valida catálogo y colores', () => {
  const ok = {
    name: 'Cálido artesanal', rationale: 'va con velas', templateId: 'nature',
    colors: { primary: '#3F5D3A', secondary: '#B5C99A', background: '#FAFAF9', navbar: '#FFFFFF' },
  };
  assertEq(validateThemeProposal(ok), null, 'propuesta válida rechazada');
  assertTrue(validateThemeProposal({ ...ok, templateId: 'zzz' }) !== null, 'template inválida aceptada');
  assertTrue(
    validateThemeProposal({ ...ok, colors: { ...ok.colors, primary: 'azul' } }) !== null,
    'color inválido aceptado',
  );
  const { rationale: _omit, ...sinRationale } = ok as any;
  assertTrue(validateThemeProposal(sinRationale) !== null, 'propuesta sin rationale aceptada');
  assertTrue(
    validateThemeProposal({ ...ok, announcementText: 'x'.repeat(121) }) !== null,
    'announcementText de más de 120 chars aceptado',
  );
  assertTrue(
    validateThemeProposal({ ...ok, tickerText: 'Envío gratis desde $500' }) === null,
    'tickerText válido rechazado',
  );
  const rico = {
    ...ok,
    heroTitleFont: 'playfair',
    heroTitleColor: '#FFD700',
    sectionBackgrounds: { footer: '#101010', hero: '#FFF8EE' },
  };
  assertEq(validateThemeProposal(rico), null, 'propuesta rica válida rechazada');
  assertTrue(validateThemeProposal({ ...ok, heroTitleFont: 'comic-sans' }) !== null, 'font inválida aceptada');
  assertTrue(validateThemeProposal({ ...ok, heroTitleColor: 'dorado' }) !== null, 'heroTitleColor inválido aceptado');
  assertTrue(
    validateThemeProposal({ ...ok, sectionBackgrounds: { sidebar: '#101010' } }) !== null,
    'sección inválida aceptada',
  );
  assertTrue(
    validateThemeProposal({ ...ok, sectionBackgrounds: { footer: 'negro' } }) !== null,
    'fondo no-hex aceptado',
  );
});

Deno.test('update_text_banner: merge + par canónico + rechazo de color inválido', async () => {
  const { client, writes } = makeMock({
    elements: { 'text_banner/main_text_banner': { text: 'Viejo', isActive: true } },
  });
  const r = await executeDesignTool(client, 't1', 'update_text_banner', { buttonLabel: 'Compra ya' });
  assertEq(r.success, true, 'debió aplicar');
  assertEq(writes[0].payload.element_type, 'text_banner', 'element_type');
  assertEq(writes[0].payload.element_id, 'main_text_banner', 'element_id');
  assertEq(writes[0].payload.data, { text: 'Viejo', isActive: true, buttonLabel: 'Compra ya' }, 'merge');
  const { client: c2, writes: w2 } = makeMock({});
  const r2 = await executeDesignTool(c2, 't1', 'update_text_banner', { buttonBgColor: 'rojo' });
  assertEq(r2.success, false, 'color inválido debió rechazarse');
  assertEq(w2.length, 0, 'no debió escribir');
});

Deno.test('update_testimonials: par canónico + lista con ids generados', async () => {
  const { client, writes } = makeMock({ elements: {} });
  const r = await executeDesignTool(client, 't1', 'update_testimonials', {
    enabled: true, title: 'Clientes felices',
    list: [{ author: 'Ana', text: 'Me encantó' }],
  });
  assertEq(r.success, true, 'debió aplicar');
  assertEq(writes[0].payload.element_type, 'testimonials', 'element_type');
  assertEq(writes[0].payload.element_id, 'main_testimonials', 'element_id');
  const d = writes[0].payload.data as any;
  assertEq(d.enabled, true, 'enabled');
  assertEq(d.title, 'Clientes felices', 'title');
  assertEq(d.list.length, 1, 'lista');
  assertTrue(typeof d.list[0].id === 'string' && d.list[0].id.length > 0, 'id generado');
  assertEq(d.list[0].author, 'Ana', 'author');
  assertEq(d.list[0].text, 'Me encantó', 'text');
  assertEq(d.list[0].logo, '', 'logo vacío por defecto');
});

Deno.test('update_hero_text: rechaza element, fontFamily y color inválidos sin escribir', async () => {
  const { client, writes } = makeMock({ elements: {} });
  const r1 = await executeDesignTool(client, 't1', 'update_hero_text', { element: 'zzz', text: 'x' });
  assertEq(r1.success, false, 'element inválido');
  const r2 = await executeDesignTool(client, 't1', 'update_hero_text', { element: 'title', fontFamily: 'comic-sans' });
  assertEq(r2.success, false, 'fontFamily inválida');
  const r3 = await executeDesignTool(client, 't1', 'update_hero_text', { element: 'title', color: 'dorado' });
  assertEq(r3.success, false, 'color inválido');
  assertEq(writes.length, 0, 'ninguna escritura');
});

Deno.test('set_section_background: rechaza section y bgColor inválidos sin escribir', async () => {
  const { client, writes } = makeMock({ elements: {} });
  const r1 = await executeDesignTool(client, 't1', 'set_section_background', { section: 'sidebar', bgColor: '#101010' });
  assertEq(r1.success, false, 'section inválida');
  const r2 = await executeDesignTool(client, 't1', 'set_section_background', { section: 'footer', bgColor: 'negro' });
  assertEq(r2.success, false, 'bgColor inválido');
  assertEq(writes.length, 0, 'ninguna escritura');
});
