// Lifecycle checks use synthetic local data only. No external recipient is contacted.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createState } from '../app/js/engine.js';
import { browserApp, session, advance } from './lib/browser.mjs';
const app = await browserApp();
try {
 const context = await app.browser.newContext({ viewport: { width: 320, height: 740 }, acceptDownloads: true });
 const page = await context.newPage(); const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 await page.goto(app.url); await page.locator('.chapter-card').first().click();
 await page.locator('.custom-number > summary').click();
 await page.locator('.number-entry').first().fill('575');
 await page.locator('.number-entry').first().fill('999');
 assert(await page.locator('.number-error').first().isVisible());
 await page.locator('.stepper-button').first().click();
 assert.equal(await page.locator('.number-entry').first().inputValue(), '550');
 assert(await page.locator('.number-entry').first().evaluate(input => input.checkValidity()));
 await page.locator('.number-entry').first().fill('575');
 const first = await session(page);
 assert.equal(first.draftValue, 575);
 await page.locator('[data-lang="sw"]').click();
 assert.equal(await page.locator('.number-entry').first().inputValue(), '575');
 await page.reload(); await page.locator('.number-entry').first().waitFor();
 assert.equal((await session(page)).draftValue, 575);
 await page.locator('[data-lang="en"]').click();
 await page.locator('.learning-help summary').click();
 await page.waitForFunction(async () => (await (await import('./js/storage.js')).load()).assistance.length > 0);
 await page.locator('.number-decision [data-role="commit"]').click();
 const revealed = await session(page);
 assert.equal(revealed.phase, 'reveal');
 assert.equal(revealed.record.observations.find(o => o.kind === 'decision').input, 575);
 assert.equal(revealed.record.observations.find(o => o.kind === 'decision').inputMethod, 'typed');
 assert(!revealed.record.observations.some(o => o.kind === 'prediction'));
 assert(await page.locator('.is-trading .cash-motion').isVisible());
 const count = revealed.record.observations.length;
 await page.reload(); await page.locator('.reveal').waitFor();
 assert.equal((await session(page)).record.observations.length, count);
 assert.deepEqual((await session(page)).result, revealed.result);
 await page.locator('#chapters').click(); await page.locator('.chapter-card').nth(1).click();
 await page.locator('.option').first().waitFor();
 await page.locator('#chapters').click(); await page.locator('.chapter-card').first().click();
 await page.locator('.reveal').waitFor(); assert.equal((await session(page)).id, first.id);
 await page.locator('#record').click();
 assert(/your record so far/i.test(await page.locator('#decision').innerText()));
 const beforeCarry = await page.evaluate(async () => (await import('./js/storage.js')).loadCarry());
 assert.equal(beforeCarry.completed.length, 0);
 await page.evaluate(() => {
   Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
   Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.syntheticShare = JSON.parse(await data.files[0].text()); } });
 });
 await page.locator('#record').click();
 await page.getByRole('button', { name: /Share/ }).click();
 await page.waitForFunction(() => Boolean(window.syntheticShare));
 assert.equal(await page.evaluate(() => window.syntheticShare.attemptId), first.id);
 await page.evaluate(() => { window.print = () => { window.printCalled = true; }; });
 await page.getByRole('button', { name: /Print/ }).click();
 assert(await page.evaluate(() => window.printCalled));
 await page.emulateMedia({ media: 'print' }); assert(await page.locator('#print-record').isVisible());
 await page.emulateMedia({ media: 'screen' });
 const downloadEvent = page.waitForEvent('download');
 await page.getByRole('button', { name: 'Save my record', exact: true }).click();
 const download = await downloadEvent;
 const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
 assert.equal(exported.schemaVersion, 2); assert.equal(exported.attemptId, first.id);
 assert(exported.observations.some(o => o.kind === 'assistance'));
 await page.getByRole('button', { name: 'Back to my decision', exact: true }).click();
 await page.locator('#reset').click(); await page.locator('.number-decision').waitFor();
 assert.notEqual((await session(page)).id, first.id);
 assert.equal(await page.evaluate(async () => (await (await import('./js/storage.js')).backup(true)).filter(([key]) => key.startsWith('attempt:')).length), 3);
 // Save failure is visible; retry writes the in-memory draft without deleting the old record.
 await page.evaluate(() => {
   const original = IDBDatabase.prototype.transaction;
   window.restoreWrites = () => { IDBDatabase.prototype.transaction = original; };
   IDBDatabase.prototype.transaction = function(...args) { if(args[1] === 'readwrite') throw new DOMException('Synthetic quota', 'QuotaExceededError'); return original.apply(this,args); };
 });
 await page.locator('.custom-number > summary').click();
 await page.locator('.number-entry').first().fill('600');
 await page.waitForFunction(() => document.getElementById('save-status').textContent.includes('may not be saved'));
 assert.equal(await page.evaluate(async () => (await (await import('./js/storage.js')).load()).draftValue), 600);
 await page.evaluate(() => window.restoreWrites()); await page.locator('#save-status').click();
 assert.equal((await session(page)).draftValue, 600);
 // Text scaling, touch targets and focus.
 await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
 assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
 const tiny = await page.locator('button:visible, summary:visible, input:visible').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().height < 47).map(n => n.textContent));
 assert.deepEqual(tiny, []);
 await advance(page);
 assert.equal(await page.evaluate(() => document.activeElement.id), 'decision');
 // First visit becomes usable offline, including after reload.
 await page.evaluate(() => navigator.serviceWorker.ready);
 await page.waitForFunction(async () => (await caches.keys()).some(key => key.endsWith(':content')));
 await context.setOffline(true); await page.reload(); await page.locator('.reveal').waitFor();
 assert.equal((await session(page)).phase, 'reveal');
 await context.setOffline(false);
 for (const status of [404, 503]) {
   app.failContent(status);
   const cached = await page.evaluate(async () => (await fetch('./content/scenario-mama-asha.json')).json());
   assert.equal(cached.id, 'mama-asha');
 }
 app.failContent(0);
 // A shell update must wait for the open game, and preserve other origin caches.
 await page.evaluate(async () => { const cache = await caches.open('unrelated-app'); await cache.put('/synthetic', new Response('keep')); });
 await page.evaluate(async () => {
   const url = new URL('./content/scenario-bakery.json', location.href);
   const legacy = await caches.open('business-simulator-a1b2c3d4');
   await legacy.put(url, await fetch(url));
   for (const key of await caches.keys()) if (key.endsWith(':content')) await (await caches.open(key)).delete(url);
 });
 app.updateWorker();
 await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
 await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
 assert(await page.evaluate(async () => Boolean(await caches.match('/synthetic'))));
 const savedId = (await session(page)).id;
 await page.close();
 const fresh = await context.newPage(); await fresh.goto(app.url); await fresh.locator('.reveal').waitFor();
 await fresh.waitForFunction(async () => !(await caches.keys()).some(key => key.endsWith(':test-a')));
 assert.equal((await session(fresh)).id, savedId);
 assert(await fresh.evaluate(async () => Boolean(await caches.match('/synthetic'))));
 assert(await fresh.evaluate(async () => (await caches.keys()).some(key => key.endsWith(':content'))));
 assert(await fresh.evaluate(async () => { const key = (await caches.keys()).find(k => k.endsWith(':content')); return Boolean(await (await caches.open(key)).match('./content/scenario-bakery.json')); }));
 // Shared-phone profiles must keep stable numbers and separate attempt records.
 await fresh.locator('#learners').click();
 await fresh.getByRole('button', { name: 'Start for another learner', exact: true }).click();
 await fresh.locator('.chapter-card').first().click(); await fresh.locator('.number-preset').first().waitFor();
 assert.notEqual((await session(fresh)).profileId, 'default');
 assert.equal(await fresh.evaluate(async () => (await (await import('./js/storage.js')).backup(true)).filter(([key]) => key.startsWith('attempt:')).length), 1);
 await fresh.locator('#learners').click();
 fresh.once('dialog', dialog => dialog.accept());
 await fresh.getByRole('button', { name: /Delete this learner/ }).click();
 await fresh.locator('.chapter-card').first().waitFor();
 await fresh.locator('#learners').click();
 await fresh.getByRole('button', { name: 'Learner 1', exact: true }).click();
 await fresh.locator('.chapter-card').first().click(); await fresh.locator('.reveal').waitFor();
 assert.equal((await session(fresh)).id, savedId);
 assert.equal(await fresh.evaluate(async () => (await (await import('./js/storage.js')).backup(true)).filter(([key]) => key.startsWith('attempt:')).length), 3);
 await fresh.screenshot({ path: '/tmp/MV-BS-result-mobile.png', fullPage: true });
 assert.deepEqual(errors, []);
 await context.close();
 // Legacy migration and unsupported records retain their original source bytes.
 const legacy = await app.browser.newContext(); const old = await legacy.newPage();
 await old.addInitScript(() => localStorage.setItem('business-simulator:v1', JSON.stringify({ schemaVersion: 99, synthetic: true })));
 await old.goto(app.url); await old.locator('.chapter-card').first().waitFor();
 assert.equal(await old.evaluate(() => JSON.parse(localStorage.getItem('business-simulator:v1')).schemaVersion), 99);
 assert(await old.evaluate(async () => (await (await import('./js/storage.js')).backup()).some(([key, value]) => key === 'legacy' && JSON.parse(value.raw).schemaVersion === 99)));
 await legacy.close();
 // A valid legacy attempt keeps observed turn order when current content is reordered.
 const migration = await app.browser.newContext(); const migratedPage = await migration.newPage();
 const factory = JSON.parse(await readFile(new URL('../app/content/scenario-factory.json', import.meta.url), 'utf8'));
 const doneIds = Array.from({ length: 17 }, (_, i) => `t${String(i + 1).padStart(2, '0')}`);
 const legacyValue = { schemaVersion: 1, scenarioId: 'factory', turnIndex: 17, phase: 'predict',
   state: createState(factory.startState), history: [], recoveryAt: [], recoveriesUsed: 0,
   sought: [], inputValue: 123, chosenOptionId: null, predictedId: null, diagnosed: null,
   record: { schemaVersion: 1, scenarioId: 'factory', startedAt: '2026-01-01T00:00:00.000Z', observations: doneIds.map(turnId => ({ kind: 'decision', turnId })) } };
 const raw = JSON.stringify(legacyValue);
 await migratedPage.addInitScript(raw => { if (!localStorage.getItem('business-simulator:v1')) localStorage.setItem('business-simulator:v1', raw); }, raw);
 await migratedPage.goto(app.url); await migratedPage.locator('.episode-progress').waitFor();
 const migrated = await session(migratedPage);
 assert.equal(migrated.authoredDone, 17); assert.equal(migrated.scenarioSnapshot.turns[migrated.turnIndex].id, 't20');
 assert.deepEqual(migrated.scenarioSnapshot.turns.slice(0, 17).map(t => t.id), doneIds);
 assert.equal(migrated.record.observations.find(o => o.kind === 'calculation-transition').legacyDraft.inputValue, 123);
 assert.equal(await migratedPage.evaluate(() => localStorage.getItem('business-simulator:v1')), raw);
 await migratedPage.reload(); await migratedPage.locator('.episode-progress').waitFor();
 assert.equal((await session(migratedPage)).record.observations.filter(o => o.kind === 'calculation-transition').length, 1);
 // A newer format is preserved, with a visible backup path instead of a silent reset.
 await migratedPage.evaluate(async () => {
   const store = await import('./js/storage.js'); const saved = await store.load(); saved.schemaVersion = 99;
   await new Promise((resolve, reject) => { const req = indexedDB.open('business-simulator'); req.onsuccess = () => { const db = req.result; const tx = db.transaction('items', 'readwrite'); tx.objectStore('items').put(saved, `attempt:${saved.id}`); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }; });
 });
 await migratedPage.reload(); await migratedPage.getByRole('button', { name: 'Try again', exact: true }).waitFor();
 assert((await migratedPage.locator('#decision').innerText()).includes('cannot be opened safely'));
 assert.equal(await migratedPage.evaluate(async () => (await (await import('./js/storage.js')).backup(true)).find(([key]) => key.startsWith('attempt:'))[1].schemaVersion), 99);
 await migration.close();
 // Counts must not turn half a person into a full wage and half the added output.
 const countsContext = await app.browser.newContext(); const countsPage = await countsContext.newPage();
 await countsPage.goto(app.url); await countsPage.locator('.chapter-card').first().click();
 await countsPage.locator('.number-preset').first().waitFor();
 await countsPage.evaluate(async () => { const store = await import('./js/storage.js'); const saved = await store.load(); saved.turnIndex = 12; saved.authoredDone = 12; await store.save(saved); });
 await countsPage.reload(); await countsPage.locator('.custom-number > summary').click(); await countsPage.locator('.number-entry').first().fill('0.5');
 assert.equal(await countsPage.locator('.number-entry').first().getAttribute('step'), '1');
 assert(!await countsPage.locator('.number-entry').first().evaluate(input => input.checkValidity()));
 await countsPage.locator('.stepper-button').nth(1).click();
 assert.equal(await countsPage.locator('.number-entry').first().inputValue(), '1');
 assert(await countsPage.locator('.number-entry').first().evaluate(input => input.checkValidity()));
 await countsContext.close();
 // The standalone file needs neither a server nor a network after download.
 const standalone = await app.browser.newContext(); await standalone.setOffline(true);
 const filePage = await standalone.newPage(); const fileErrors = []; filePage.on('pageerror', e => fileErrors.push(e.message));
 await filePage.goto(new URL('../app/standalone.html', import.meta.url).href);
 await filePage.locator('.chapter-card').first().click(); await filePage.locator('.custom-number > summary').click(); await filePage.locator('.number-entry').first().fill('575');
 await filePage.locator('#save-status').filter({ hasText: /^(Saved|Progress saved)/ }).waitFor();
 await filePage.reload(); await filePage.locator('.number-entry').first().waitFor();
 assert.equal(await filePage.locator('.number-entry').first().inputValue(), '575');
 await filePage.locator('[data-lang="sw"]').click(); assert.equal(await filePage.locator('.number-entry').first().inputValue(), '575');
 await filePage.locator('.number-preset').last().click(); await filePage.locator('.reveal').waitFor();
 assert.equal(await filePage.locator('.number-prediction').count(), 0);
 const beforeReload = await filePage.locator('.result-totals').innerText();
 await filePage.reload(); await filePage.locator('.reveal').waitFor();
 assert.equal(await filePage.locator('.result-totals').innerText(), beforeReload);
 assert.deepEqual(fileErrors, []); await standalone.close();
 console.log('Draft, record, retry, layout, focus, offline, update, profile, migration and standalone checks passed');
} finally { await app.close(); }
