// Regenera scripts/landing-root-snippet.html capturando el DOM real de la
// landing renderizada. CORRER SOLO EN LOCAL (usa el Chrome instalado), y solo
// cuando cambie el diseño/copy de la landing:
//
//   npm run build && npx vite preview --port 4173 &   (o el preview que uses)
//   npm run capture:landing
//
// Luego commitear el snippet. El build de cada deploy lo mezcla con los
// hashes frescos (scripts/build-landing-html.mjs).

import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const PREVIEW = process.env.PREVIEW_URL || 'http://localhost:4173/';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const out = join(dirname(fileURLToPath(import.meta.url)), 'landing-root-snippet.html');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(PREVIEW, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('.phone-img', { visible: true, timeout: 30000 });

// Recorrer toda la página para que cada .reveal reciba su clase .in
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
});
await new Promise((r) => setTimeout(r, 1200));

const html = await page.evaluate(() => {
  const root = document.getElementById('root').cloneNode(true);
  // Fuera lo que monta JS después (chat de Toogi, portales, modales)
  root.querySelectorAll('.animate-scale-in, [data-radix-portal], [role="dialog"]').forEach((n) => n.remove());
  root.querySelectorAll(':scope > div:not(.l2root)').forEach((n) => n.remove());
  root.querySelectorAll('script').forEach((n) => n.remove());
  return root.innerHTML;
});

if (!html.includes('phone-img') || !html.includes('l2root')) {
  throw new Error('La captura no parece la landing — ¿el preview está sirviendo otra cosa?');
}
writeFileSync(out, html);
console.log(`snippet actualizado: ${(html.length / 1024).toFixed(1)} KB → ${out}`);
await browser.close();
