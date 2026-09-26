import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { browserApp, advance } from './lib/browser.mjs';
import { createSeason, step, can, eventOptions, quiet } from '../app/js/season.js';
const content = JSON.parse(await readFile(new URL('../app/content/season.json', import.meta.url), 'utf8'));
const app = await browserApp('season');
const record = page => page.evaluate(async () => (await import('./js/seasonstore.js')).active());
async function clickSaved(page, locator) {
 const before = (await record(page)).rev;
 await locator.click();
 await page.waitForFunction(async rev => (await (await import('./js/seasonstore.js')).active()).rev > rev, before);
}
const choose = { pot: 'buy', neema: 'yes', notebook: 'start', office: 'trial', officeResult: 'flask', neighbours: 'yes', payment: 'pay', school: 'small', schoolCounter: 'full', kiosk: 'yes', helper: 'train', away: 'cover', flour: 'price' };
try {
 for (const lang of ['en', 'sw']) {
  const ctx = await app.browser.newContext({ viewport: { width: 320, height: 740 }, reducedMotion: 'reduce', acceptDownloads: true });
  await ctx.addInitScript(() => { if (!localStorage.getItem('earlier-test')) { localStorage.setItem('business-simulator:asha-intro:v3', 'old-record-exact-bytes'); localStorage.setItem('earlier-test', '1'); } });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(app.url); await page.locator('[data-action=run]').waitFor();
  if (lang === 'sw') await page.locator('#lang').click();
  await page.waitForFunction(() => document.querySelector('#offline').textContent.startsWith('Ready') || document.querySelector('#offline').textContent.startsWith('Tayari'));
  await page.screenshot({ path: `/tmp/MV-BS-SEASON-opening-${lang}.png`, fullPage: true });
  const runBox = await page.locator('[data-action=run]').boundingBox(); assert(runBox.y + runBox.height <= 740, `First action must fit on the small screen: ${JSON.stringify(runBox)}`);
  await page.screenshot({ path: `/tmp/MV-BS-SEASON-opening-${lang}.png`, fullPage: true });
  await ctx.setOffline(true); await page.reload(); await page.locator('[data-action=run]').waitFor();
  // A standing plan control remains open after saving; it must not demand another click.
  await page.locator('[data-tile=cook] > summary').click();
  await clickSaved(page, page.locator('[data-action=more][data-for=trays]'));
  assert(await page.locator('[data-tile=cook]').getAttribute('open') !== null);
  await page.locator('[data-tile=cook] > summary').click();
  let screens = 0;
  while ((await record(page)).state.week <= 24) {
   const s = (await record(page)).state;
   if (s.phase === 'event') {
    const preferred = page.locator(`[data-action=answer][data-option="${choose[s.pending]}"]:not(:disabled)`);
    await clickSaved(page, await preferred.count() ? preferred : page.locator('[data-action=answer]:not(:disabled)').last());
    if (['pot', 'payment', 'helper'].includes(s.pending)) {
     const saved = await record(page), feedback = await page.locator('.outcome').innerText();
     await page.reload(); await page.locator('.outcome').waitFor();
     assert.equal(await page.locator('.outcome').innerText(), feedback, 'Decision feedback survives offline reload');
     assert.deepEqual(await record(page), saved, 'Restoring feedback never commits a second action');
    }
    if (s.pending === 'notebook') {
     await page.locator('[data-tile=collect] > summary').click();
     await clickSaved(page, page.locator('[data-action=chase][data-who=neema]'));
     const saved = await record(page), feedback = await page.locator('#main [role=status]').innerText();
     await page.locator('#lang').click();
     assert.notEqual(await page.locator('#main [role=status]').innerText(), feedback, 'Collection feedback translates immediately');
     await page.locator('#lang').click(); await page.reload(); await page.locator('#main [role=status]').waitFor();
     assert.equal(await page.locator('#main [role=status]').innerText(), feedback);
     assert.deepEqual(await record(page), saved);
    }
   } else if (s.phase === 'review') {
    await clickSaved(page, page.locator('[data-action=goal][data-goal=away]'));
    await clickSaved(page, page.locator('[data-action=review]'));
   } else {
    if (s.week === 3) {
     await page.locator('[data-tile=cook] > summary').click();
     const before = (await record(page)).rev;
     await page.locator('[data-field=trays]').fill('8'); await page.locator('[data-field=trays]').press('Tab');
     await page.waitForFunction(async rev => (await (await import('./js/seasonstore.js')).active()).rev > rev, before);
     await page.locator('[data-tile=cook] > summary').click();
    }
    await clickSaved(page, page.locator('[data-action=run]'));
    const last = (await record(page)).state.history.at(-1);
    await page.getByRole('heading', { name: content.ui.result[lang].replace('{n}', last.week), exact: true, includeHidden: true }).waitFor({ state: 'attached' });
    const visibleNotes = await page.locator('[data-testid=result] > .notes').textContent();
    for (const id of last.notes) assert(visibleNotes.includes(content.ui[`note.${id}`][lang].split('{')[0]), `Show ${id} without opening more results`);
    for (const id of last.late) assert(visibleNotes.includes(content.ui['note.late'][lang].replace('{who}', content.ui[`who.${id}`][lang])), `Late payment is visible: ${lang} week ${last.week}, ${visibleNotes}`);
    if (s.week === 1 || s.week === 17 || s.week === 18) {
     const saved = await record(page);
     await page.reload(); await page.locator('[data-testid=result]').waitFor();
     assert.deepEqual(await record(page), saved, 'Reload never repeats a transaction');
     await page.screenshot({ path: `/tmp/MV-BS-SEASON-week${s.week}-${lang}.png`, fullPage: true });
    }
   }
   assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow ${lang} week ${s.week}`);
   assert(!/\{\w+\}/.test(await page.locator('#main').innerText()), `Unfilled placeholder ${s.week}`);
   assert(++screens < 100);
  }
  await page.locator('[data-testid=review]').waitFor();
  await page.addStyleTag({ content: 'html { font-size: 34px !important; }' });
  await page.screenshot({ path: `/tmp/MV-BS-SEASON-review-${lang}.png`, fullPage: true });
  const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0,12).map(el => [el.tagName, el.className, el.textContent.slice(0,70)]));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `200% text must fit: ${JSON.stringify(overflow)}`);
  await page.screenshot({ path: `/tmp/MV-BS-SEASON-review-${lang}.png`, fullPage: true });
  await page.locator('#records-tools').click();
  const download = page.waitForEvent('download'); await page.locator('#export').click();
  const exported = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  assert.equal(exported.state.history.length, 24); assert.equal(exported.level, 'simulated'); assert(exported.content.snapshot.ui); assert(exported.log.every(x => x.result && x.language));
  assert.equal(await page.evaluate(() => localStorage.getItem('business-simulator:asha-intro:v3')), 'old-record-exact-bytes');
  assert.deepEqual(errors, []); console.log(`Season ${lang}: ${screens} mobile screens, offline, reload, export and old records passed.`);
  await ctx.close();
 }
 // Find a reachable late-payment week which would otherwise be skipped by runUntil.
 let target;
 for (let seed = 1; seed <= 30 && !target; seed++) {
  let state = createSeason({ seed }); const log = [];
  while (state.week <= 24) {
   const action = state.phase === 'review' ? { type: 'review' } : state.phase === 'event'
    ? { type: 'answer', option: eventOptions(state.pending).find(option => can(state, { type: 'answer', option })) }
    : { type: 'run' };
   const out = step(state, action);
   if (action.type === 'run' && out.result.late.length && quiet(out.state)) { target = { seed, state, log }; break; }
   log.push({ action, result: out.result, week: state.week, phase: state.phase, event: state.pending, language: 'en' }); state = out.state;
  }
 }
 assert(target, 'Reach a payment setback while routine trading could continue');
 const pauseCtx = await app.browser.newContext({ reducedMotion: 'reduce' }), pause = await pauseCtx.newPage();
 await pause.goto(app.url); await pause.locator('[data-action=run]').waitFor();
 await pause.evaluate(async target => { const store = await import('./js/seasonstore.js'); const r = await store.active(); Object.assign(r, target); await store.save(r, r.rev); }, target);
 await pause.reload(); await pause.locator('[data-action=runUntil]').waitFor();
 await clickSaved(pause, pause.locator('[data-action=runUntil]'));
 assert.equal((await record(pause)).state.week, target.state.week + 1, 'Run until needed stops at the first late payment');
 await pauseCtx.close();
 // Real motion, stale tabs, save failure and separate attempts.
 const ctx = await app.browser.newContext({ viewport: { width: 360, height: 800 }, acceptDownloads: true });
 const a = await ctx.newPage(); await a.goto(app.url); await a.locator('[data-action=run]').waitFor();
 const b = await ctx.newPage(); await b.goto(app.url); await b.locator('[data-action=run]').waitFor();
 await clickSaved(a, a.locator('[data-action=run]')); assert(await a.locator('#scene').evaluate(el => el.classList.contains('playing')));
 assert(await a.locator('.fx.coin').count() > 0);
 const motionRecord = await record(a);
 await a.locator('#lang').click();
 assert.equal(await a.locator('#scene.playing').count(), 0, 'Language change stops obsolete playback');
 assert.equal(await a.locator('.fx').count(), 0); assert(await a.locator('#skip').isHidden());
 assert.deepEqual(await record(a), motionRecord, 'Stopping playback changes no business facts');
 await a.locator('#lang').click();
 const persisted = await record(a);
 await b.locator('[data-action=run]').click(); await b.locator('#reload').waitFor();
 assert.deepEqual(await record(a), persisted, 'Stale tab did not overwrite');
 await b.close();
 await a.evaluate(() => { const original = IDBDatabase.prototype.transaction; window.restoreTransactions = () => { IDBDatabase.prototype.transaction = original; }; IDBDatabase.prototype.transaction = function (...args) { if (args[1] === 'readwrite') throw new DOMException('Test full', 'QuotaExceededError'); return original.apply(this, args); }; });
 await a.locator('[data-action=answer]:not(:disabled)').first().click(); await a.locator('#retry').waitFor();
 assert.deepEqual(await record(a), persisted, 'Failed save left durable record intact');
 assert(await a.locator('#main button:not(:disabled)').count() === 0);
 await a.evaluate(() => window.restoreTransactions()); await a.locator('#retry').click();
 await a.waitForFunction(() => document.querySelector('#saved').className === 'ok');
 assert((await record(a)).rev > persisted.rev);
 a.on('dialog', d => d.accept());
 await a.locator('#records-tools').click(); await a.locator('#runs-title').click();
 await a.locator('[data-action=new]').click(); await a.locator('[data-action=run]').waitFor();
 assert.equal((await record(a)).run, 2);
 assert.equal(await a.evaluate(async () => (await (await import('./js/seasonstore.js')).list()).length), 2);
 await clickSaved(a, a.locator('[data-action=run]'));
 await clickSaved(a, a.locator('[data-action=answer][data-option=buy]'));
 assert.equal(await a.locator('#scene.playing').count(), 0, 'Decision ends the old animation');
 assert.equal(await a.locator('#scene .pot').count(), (await record(a)).state.pots, 'Scene shows the newly bought pot immediately');
 await clickSaved(a, a.locator('[data-action=answer][data-option=no]'));
 await clickSaved(a, a.locator('[data-action=run]'));
 await a.locator('#skip').click();
 assert.equal(await a.locator('#scene.playing').count(), 0, 'Skip still ends playback');
 // A malformed local record is preserved for download, not replaced by a fresh run.
 const corrupt = await a.evaluate(async () => { const store = await import('./js/seasonstore.js'); const r = await store.active(); r.state.cash++; await store.save(r, r.rev); return store.active(); });
 await a.reload(); await a.locator('#main [data-action=export]').waitFor(); assert.deepEqual(await record(a), corrupt);
 await ctx.close();
 // Upgrade from an earlier-game cache while opening the new entry. Keep downloaded chapters.
 const upgrade = await app.browser.newContext();
 const old = await upgrade.newPage(); await old.goto(app.url + 'practice.html');
 await old.locator('.chapter-card').first().click();
 await advance(old);
 await old.locator('[data-role=next]').waitFor();
 await old.waitForFunction(async () => Boolean(await caches.match('./content/scenario-mama-asha.json')));
 await old.waitForFunction(async () => Boolean(await (await import('./js/storage.js')).load()));
 const earlierId = await old.evaluate(async () => (await (await import('./js/storage.js')).load()).id);
 const newPage = await upgrade.newPage(); await newPage.goto(app.url); await newPage.locator('[data-action=run]').waitFor();
 app.updateWorker();
 await newPage.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
 await newPage.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
 await old.close(); await newPage.close();
 const resumed = await upgrade.newPage(); await resumed.goto(app.url); await resumed.locator('[data-action=run]').waitFor();
 await resumed.waitForFunction(async () => (await caches.keys()).some(k => k.endsWith('test-b')));
 await upgrade.setOffline(true); await resumed.reload(); await resumed.locator('[data-action=run]').waitFor();
 await resumed.goto(app.url + 'practice.html'); await resumed.locator('#decision button').first().waitFor();
 assert.equal(await resumed.evaluate(async () => (await (await import('./js/storage.js')).load()).id), earlierId);
 assert(await resumed.evaluate(async () => Boolean(await caches.match('./content/scenario-mama-asha.json'))));
 await upgrade.close();
 // Generated file is also playable without a server or network.
 const fileCtx = await app.browser.newContext({ reducedMotion: 'reduce' }); const file = await fileCtx.newPage();
 await file.goto(new URL('../app/season-standalone.html', import.meta.url).href); await file.locator('[data-action=run]').waitFor();
 await file.locator('[data-action=run]').click(); await file.locator('[data-testid=result]').waitFor();
 const cash = await file.locator('#cash').innerText(); await file.reload(); await file.locator('[data-testid=result]').waitFor(); assert.equal(await file.locator('#cash').innerText(), cash);
 await fileCtx.close();
 console.log('Season: motion/skip, concurrent tabs, save recovery, retained attempts and standalone passed.');
} finally { await app.close(); }
