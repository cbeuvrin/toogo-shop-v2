// deno test supabase/functions/_shared/inspiration.test.ts
import { buildInspirationPrompt, validateInspirationInput } from './inspiration.ts';

function assertTrue(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test('validateInspirationInput: exige tenantId y al menos una entrada', () => {
  assertTrue(validateInspirationInput({}) !== null, 'sin tenantId debió fallar');
  assertTrue(validateInspirationInput({ tenantId: 't1' }) !== null, 'sin imagen ni descripción debió fallar');
  assertTrue(validateInspirationInput({ tenantId: 't1', description: 'velas artesanales' }) === null, 'descripción sola es válida');
});

Deno.test('validateInspirationInput: imagen requiere mime permitido y tamaño', () => {
  const img = { tenantId: 't1', imageBase64: 'aGk=', mimeType: 'image/png' };
  assertTrue(validateInspirationInput(img) === null, 'png válido rechazado');
  assertTrue(validateInspirationInput({ ...img, mimeType: 'image/gif' }) !== null, 'gif debió rechazarse');
  assertTrue(
    validateInspirationInput({ ...img, imageBase64: 'x'.repeat(6_000_001) }) !== null,
    'imagen gigante debió rechazarse',
  );
});

Deno.test('buildInspirationPrompt: incluye catálogo completo y reglas anti-copia', () => {
  const p = buildInspirationPrompt('joyería minimalista');
  for (const nombre of ['Atlántico', 'Caribe', 'Cyber', 'Nature & Earth']) {
    assertTrue(p.includes(nombre), `falta la plantilla ${nombre} en el prompt`);
  }
  assertTrue(p.includes('joyería minimalista'), 'no incorpora la descripción del usuario');
  assertTrue(p.toLowerCase().includes('no copies'), 'faltan las reglas anti-copia');
});
