import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startRun, steps, currentBeat, choose, advance, finish, validRun, OPENING } from '../app/js/entrymodel.js';
import { browserApp } from './lib/browser.mjs';
const game = JSON.parse(await readFile(new URL('../app/content/game.json', import.meta.url), 'utf8'));
function translated(value) {
  if (!value || typeof value !== 'object') return;
  if ('en' in value || 'sw' in value) assert(value.en?.trim() && value.sw?.trim(), JSON.stringify(value));
  for (const item of Object.values(value)) translated(item);
}
translated(game);
assert(game.unverified);
assert.equal(steps(startRun(game)).length, 13);
let seed = 5821;
const random = n => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed >>> 8) % n; };
const visited = new Set();
for (let path = 0; path < 1000; path++) {
  let run = startRun(game);
  while (currentBeat(run).kind !== 'note') {
    const beat = currentBeat(run);
    const option = beat.options[random(beat.options.length)];
    visited.add(beat.id + ':' + option.id);
    const before = structuredClone(run);
    run = choose(run, option.id);
    assert.deepEqual(before.state, run.observations.at(-1).before);
    assert(validRun(run), `${path}: ${beat.id}`);
    assert.throws(() => choose(run, option.id));
    const cashChange = run.state.cash - before.state.cash;
    const obs = run.observations.at(-1);
    assert.equal(cashChange, obs.receipts - obs.payments);
    if (beat.id === 'flour' && option.id === 'credit') {
      assert.equal(cashChange, 0); assert.equal(run.state.debt, 4500);
    }
    if (beat.id === 'repay') assert.equal(run.state.debt, 0);
    if (beat.id === 'home' && option.id === 'keep') assert.equal(cashChange, 0);
    if (beat.id === 'disruption' && before.state.receivable === 0) assert(!beat.options.some(o => o.id === 'collect'));
    run = advance(run); assert(validRun(run));
  }
  run = finish(run); assert(validRun(run));
  assert.equal(run.observations.length, 13);
  assert.throws(() => finish(run));
  assert.equal(run.state.cash, OPENING.cash + run.observations.filter(o => o.kind === 'decision').reduce((sum, o) => sum + o.receipts - o.payments, 0));
  const bad = structuredClone(run); bad.state.cash++; assert(!validRun(bad));
}
for (const beat of steps(startRun(game))) {
  for (const option of [...(beat.options || []), ...(beat.creditVariant?.options || [])]) assert(visited.has(beat.id + ':' + option.id));
}
console.log('Asha: 1,000 complete paths, cash reconciliation, branching, debt and replay passed');
const app = await browserApp(true);
try {
  for (const lang of ['en', 'sw']) {
    const ctx = await app.browser.newContext({ viewport: { width: 320, height: 740 }, reducedMotion: 'reduce', acceptDownloads: true });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(app.url); await page.locator('[data-option]').first().waitFor();
    if (lang === 'sw') await page.locator('#lang-btn').click();
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(async () => Boolean(await caches.match('./content/game.json')));
    await ctx.setOffline(true); await page.reload(); await page.locator('[data-option]').first().waitFor();
    await page.screenshot({ path: `/tmp/MV-BS-INTRO-opening-${lang}.png`, fullPage: true });
    const expected = ['mid', 'helper', 'credit', 'balanced', 'organisation', 'new', 'check', 'credit', 'collect', 'settle', 'keep', '16000'];
    const readRun = () => page.evaluate(() => JSON.parse(localStorage.getItem('business-simulator:asha-intro:v3')));
    for (const id of expected) {
      await page.locator(`[data-option="${id}"]`).click(); await page.locator('.cash-change').waitFor();
      const run = await readRun(); assert.equal(run.phase, 'result'); assert(validRun(run));
      await page.reload(); await page.locator('.cash-change').waitFor();
      assert.deepEqual(await readRun(), run, 'Reload cannot duplicate a decision or payment');
      await page.addStyleTag({ content: 'html { font-size: 32px; }' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const small = await page.locator('button:visible, summary:visible').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().height < 47).length);
      assert.equal(small, 0);
      await page.addStyleTag({ content: 'html { font-size: 16px; }' });
      await page.locator('#card .primary').click();
    }
    const note = '<img src=x onerror="window.injected=true">';
    await page.locator('#note').fill(note);
    await page.reload(); await page.locator('#note').waitFor(); assert.equal(await page.locator('#note').inputValue(), note);
    await page.locator('#card .primary').click(); await page.locator('#card a.primary').waitFor();
    await page.reload(); await page.locator('#card a.primary').waitFor();
    assert.equal((await readRun()).phase, 'complete');
    assert.equal(await page.locator('#card img').count(), 0);
    assert(!(await page.evaluate(() => window.injected)));
    const downloadEvent = page.waitForEvent('download'); await page.locator('#download').click();
    const download = await downloadEvent;
    assert.deepEqual(JSON.parse(await readFile(await download.path(), 'utf8')), await readRun());
    await page.screenshot({ path: `/tmp/MV-BS-INTRO-${lang}.png`, fullPage: true });
    // Reflow at 200% text; every action retains a touch target.
    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#card a.primary').click(); await page.locator('.chapter-card').first().waitFor();
    assert.deepEqual(errors, []); await ctx.close();
  }
  const ctx = await app.browser.newContext(); const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('asha-stall-v2', '{"old":"keep"}');
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key.includes('asha-intro')) throw new DOMException('full','QuotaExceededError'); return original.call(this,key,value); };
    window.restoreWrites = () => { Storage.prototype.setItem = original; };
  });
  await page.goto(app.url); await page.locator('[data-option]').first().click();
  assert(await page.locator('#retry').isVisible());
  await page.evaluate(() => window.restoreWrites()); await page.locator('#retry').click();
  assert(!(await page.locator('#retry').isVisible()));
  assert.equal(await page.evaluate(() => localStorage.getItem('asha-stall-v2')), '{"old":"keep"}');
  await ctx.close();
  const tabs = await app.browser.newContext(); const first = await tabs.newPage(); const second = await tabs.newPage();
  await first.goto(app.url); await first.locator('[data-option]').first().waitFor();
  await second.goto(app.url); await second.locator('[data-option]').first().waitFor();
  await first.locator('[data-option=mid]').click();
  const stored = await first.evaluate(() => localStorage.getItem('business-simulator:asha-intro:v3'));
  await second.locator('[data-option=low]').click();
  assert.match(await second.locator('#save-status').innerText(), /another tab/);
  assert.equal(await second.evaluate(() => localStorage.getItem('business-simulator:asha-intro:v3')), stored);
  await tabs.close();
  const corrupt = await app.browser.newContext(); const bad = await corrupt.newPage();
  await bad.addInitScript(() => localStorage.setItem('business-simulator:asha-intro:v3', '{broken'));
  await bad.goto(app.url); await bad.getByText('This save cannot be opened.', { exact: false }).first().waitFor();
  assert.equal(await bad.evaluate(() => localStorage.getItem('business-simulator:asha-intro:v3')), '{broken');
  await corrupt.close();
  const local = await app.browser.newContext(); await local.setOffline(true); const file = await local.newPage();
  await file.goto(new URL('../app/intro-standalone.html', import.meta.url).href);
  await file.locator('[data-option]').first().click(); await file.locator('.cash-change').waitFor();
  await file.reload(); await file.locator('.cash-change').waitFor(); await local.close();
  console.log('Asha: bilingual mobile playthrough, offline reload, records, save failures, old-save preservation and standalone passed');
} finally { await app.close(); }
