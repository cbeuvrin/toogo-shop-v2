// Genera dist/landing.html: el index.html FRESCO del build (hashes actuales)
// con el hero/landing prerenderizado dentro de #root, en vez del loader.
//
// Por qué así y no con un navegador en el build (Playwright/puppeteer):
//  - El build de Vercel no trae Chrome; un browser en CI es lento y frágil.
//  - Lo único que cambia entre deploys son los HASHES de los chunks; el
//    markup del hero solo cambia cuando se toca el diseño de la landing.
//    Este merge toma los hashes frescos de dist/index.html y el markup del
//    snippet commiteado → nunca hay referencias muertas a chunks viejos.
//
// El snippet (scripts/landing-root-snippet.html) se regenera SOLO cuando
// cambia el diseño/copy de la landing: npm run capture:landing (levanta el
// preview y captura el DOM renderizado). Si se te olvida, la landing vieja
// se ve un instante y React la reemplaza — feo pero no roto.
//
// IMPORTANTE multi-tenant: dist/index.html NO SE TOCA. landing.html lo
// sirve el Edge Middleware únicamente para toogo.store/www.toogo.store en
// '/'; las tiendas de clientes siguen recibiendo index.html.

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'dist', 'index.html');
const snippetPath = join(root, 'scripts', 'landing-root-snippet.html');
const outPath = join(root, 'dist', 'landing.html');

let html = readFileSync(indexPath, 'utf8');
const snippet = readFileSync(snippetPath, 'utf8');

if (!snippet.includes('phone-img') || !snippet.includes('l2root')) {
  throw new Error('El snippet no parece la landing (falta phone-img/l2root) — regenera con npm run capture:landing');
}

// Reemplazar TODO el contenido de <div id="root"> (el loader estático) por el
// snippet. Vite mueve el <script type="module"> al <head>, así que el cierre
// correcto del root es el último </div> antes de </body>.
const rootOpen = html.indexOf('<div id="root">');
const bodyClose = html.indexOf('</body>');
if (rootOpen === -1 || bodyClose === -1 || bodyClose < rootOpen) {
  throw new Error('Estructura inesperada en dist/index.html (no encuentro #root o </body>)');
}
const rootClose = html.lastIndexOf('</div>', bodyClose);
if (rootClose === -1 || rootClose < rootOpen) {
  throw new Error('No encuentro el cierre de #root en dist/index.html');
}

html = html.slice(0, rootOpen)
  + '<div id="root">' + snippet + '</div>'
  + '\n    <script>window.__prerendered = true;</script>\n    '
  + html.slice(rootClose + '</div>'.length);

// Supabase no participa en el primer paint de la landing: fuera su
// modulepreload SOLO aquí (el provider lo importa igual cuando lo necesite).
html = html.replace(/\s*<link rel="modulepreload"[^>]*supabase-[^>]*>/g, '');

// El CSS de la landing viaja en el chunk de LandingNueva, que carga el JS.
// Pero el markup del hero ya está EN el HTML (arriba), así que el navegador
// lo pintaba con el CSS base —que no tiene ninguna de estas clases— y se veía
// un instante sin estilos: el <img> del ícono de WhatsApp del <h1> no trae
// width/height y su SVG solo tiene viewBox, así que sin CSS el navegador lo
// pinta al tamaño por defecto de un reemplazado (300x150). De ahí el
// "WhatsApp gigante" antes de que hidratara React.
// Lo enlazamos como hoja bloqueante para que el markup prerenderizado y su
// CSS lleguen juntos. Solo aquí: index.html (las tiendas) no lo necesita.
const landingCss = readdirSync(join(root, 'dist', 'assets'))
  .find((f) => /^LandingNueva-.*\.css$/.test(f));
if (!landingCss) {
  throw new Error('No encuentro dist/assets/LandingNueva-*.css — ¿cambió el nombre del chunk?');
}
// Después de la hoja principal, para conservar el mismo orden de cascada que
// tenía en runtime (base primero, landing después).
const mainCss = /<link rel="stylesheet"[^>]*href="\/assets\/index-[^"]+\.css"[^>]*>/;
if (!mainCss.test(html)) {
  throw new Error('No encuentro la hoja de estilos principal en dist/index.html');
}
html = html.replace(
  mainCss,
  (tag) => `${tag}\n  <link rel="stylesheet" crossorigin href="/assets/${landingCss}">`,
);

writeFileSync(outPath, html);

const kb = (html.length / 1024).toFixed(1);
const checks = {
  'phone-img en landing.html': html.includes('phone-img'),
  'sin modulepreload de supabase': !/modulepreload[^>]*supabase-/.test(html),
  '__prerendered flag': html.includes('window.__prerendered'),
  'script del bundle intacto': html.includes('<script type="module"'),
  'CSS de la landing enlazado en el head':
    html.indexOf(`/assets/${landingCss}`) !== -1 &&
    html.indexOf(`/assets/${landingCss}`) < html.indexOf('</head>'),
};
console.log(`dist/landing.html generado (${kb} KB)`);
for (const [k, v] of Object.entries(checks)) {
  console.log(`  ${v ? '✓' : '✗ FALLO'} ${k}`);
  if (!v) process.exit(1);
}
