import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
export async function browserApp() {
  const root = fileURLToPath(new URL('../../app/', import.meta.url));
  let workerVersion = 'test-a';
  let contentFailure = 0;
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (contentFailure && pathname.includes('/content/scenario-')) { res.writeHead(contentFailure).end(); return; }
    const file = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    try {
      let bytes = await readFile(file);
      if (pathname === '/sw.js') bytes = Buffer.from(bytes.toString().replace("const CACHE = 'business-simulator-v1'", `const CACHE = '${workerVersion}'`));
      const type = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.webmanifest': 'application/manifest+json' }[extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(bytes);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  return { browser, url: `http://127.0.0.1:${server.address().port}/`,
    failContent: status => { contentFailure = status; },
    updateWorker: () => { workerVersion = 'test-b'; },
    close: async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); },
  };
}
export const session = page => page.evaluate(async () => (await import('./js/storage.js')).load());
export async function advance(page) {
  if (await page.locator('[data-role="next"]').count()) return page.locator('[data-role="next"]').click();
  if ((await session(page))?.phase === 'episode') return page.locator('#decision .btn-primary').click();
  if (await page.locator('[data-role="run"]').isVisible()) return page.locator('[data-role="run"]').click();
  if (await page.locator('.diagnose-option').count()) return page.locator('.diagnose-option').first().click();
  if (await page.locator('.cashbook').count()) {
    await page.locator('.cashbook input').fill('0');
    return page.locator('.cashbook [data-role="commit"]').click();
  }
  if (await page.locator('.number-preset').count()) return page.locator('.number-preset').first().click();
  if (await page.locator('.allocation-decision').count()) return page.locator('.allocation-decision [data-role="commit"]').click();
  if (await page.locator('.option').count()) return page.locator('.option').first().click();
  throw new Error(`No way forward: ${(await page.locator('#decision').innerText()).slice(0, 250)}`);
}
