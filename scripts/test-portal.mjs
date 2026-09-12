// Synthetic data only; the AI endpoint is a loopback mock, never a paid provider.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { createPortal } from '../portal/server.mjs';
import { CRITERIA, blankAnswers, addMonths, cashTotal, validateAnswers } from '../app/portal/model.js';
import { validateGrade } from '../portal/assessment.mjs';
const uid = () => randomUUID().replaceAll('-', '');
const copy = x => structuredClone(x);
const root = new URL('../app/', import.meta.url);
const chapters = JSON.parse(readFileSync(new URL('content/chapters.json', root))).chapters;
export function syntheticRecords(suffix = '') {
  return chapters.map(c => {
    const s = JSON.parse(readFileSync(new URL('content/' + c.file, root)));
    return { schemaVersion: 2, scenarioId: c.id, scenarioVersion: s.version, calculationVersion: 2, completed: true,
      localProfileId: 'synthetic-person', attemptId: 'synthetic-' + c.id + suffix,
      observations: s.turns.flatMap(t => [{ kind: 'decision', turnId: t.id,
        optionId: t.decision.options?.[0]?.id || t.decision.type, optionLabel: 'Synthetic game choice',
        input: t.decision.input?.min ?? null, allocation: { reserve: 0 }, calculationVersion: 2, scenarioVersion: s.version },
      { kind: 'outcome', turnId: t.id, cash: {}, profit: 0 }]) };
  });
}
const temp = mkdtempSync(join(tmpdir(), 'bs-portal-test-'));
let providerMode = 'ok', requests = [], time = new Date('2026-01-31T12:00:00Z');
const provider = createServer(async (req, res) => {
  const parts = []; for await (const p of req) parts.push(p);
  const body = JSON.parse(Buffer.concat(parts)); requests.push(body);
  if (providerMode === 'fail') return res.writeHead(503).end();
  const input = JSON.parse(body.messages[1].content[0].text), path = Object.keys(input.facts).find(k => k.startsWith('answer.') && input.facts[k].length);
  const criteria = input.criteria.map(id => ({ id, score: 3, reason: { en: 'Synthetic evidence supports this test grade.', sw: 'Ushahidi wa majaribio unaunga mkono alama hii.' }, refs: [{ path, quote: providerMode === 'bad' ? 'INVENTED QUOTE' : input.facts[path].slice(0, 80) }] }));
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ model: 'synthetic-mock', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ criteria, integrity: [] }) } }] }));
});
await new Promise(r => provider.listen(0, '127.0.0.1', r));
const admin = 'synthetic-admin-secret-with-enough-entropy';
const portal = createPortal({ dbPath: join(temp, 'portal.sqlite'), secret: 'synthetic-server-secret-0123456789abcdef',
  adminToken: admin, now: () => time, ai: { url: `http://127.0.0.1:${provider.address().port}`, model: 'synthetic-mock' } });
await new Promise(r => portal.server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${portal.server.address().port}`;
let checks = 0;
async function api(path, body, token, expected = 200) {
  const response = await fetch(base + '/api/portal/' + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json(); assert.equal(response.status, expected, `${path}: ${JSON.stringify(result).slice(0, 200)}`); checks++;
  assert.equal(response.headers.get('cache-control'), 'no-store'); return result;
}
function application() {
  const a = blankAnswers('application', portal.config);
  Object.assign(a, { business: 'Synthetic small food business', customer: 'Synthetic market buyers', action: 'Test five paid orders', success: 'Five buyers pay',
    openingCash: 100, spendItem: 'Stock', spendAmount: 800, grantReason: 'Fill paid orders', basis: 'Five synthetic paid orders',
    risk: 'Late payment', response: 'Ask for a deposit', records: 'Notebook after each sale', contact: 'private-synthetic@example.invalid', help: 'ai_answers' });
  a.periods = [1, 2, 3].map(() => ({ customers: 50, added: 0, costs: 20, drawings: 10 })); return a;
}
function report(kind) {
  const a = blankAnswers(kind, portal.config);
  Object.assign(a, { openingCash: 100, customers: 50, added: 1000, costs: 20, drawings: 10, closingCash: 1115,
    wentWell: 'Five customers paid', wentWrong: 'One paid late', why: 'Payment was due after delivery', changed: 'Asked for a deposit', result: 'Next buyer paid a deposit',
    nextAction: 'Test the deposit again', nextCustomers: 60, nextCosts: 25, evidenceNote: 'Synthetic notebook', learned: 'Ask payment terms first',
    bottleneck: 'Stock for confirmed orders', nextGrantUse: 'Fill more confirmed orders' }); return a;
}
try {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28'); assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.throws(() => addMonths('2026-02-30', 2)); assert.throws(() => addMonths('2026-99-01', 2));
  assert.equal(cashTotal(0.1, { customers: 0.2, added: 0, costs: 0.1, drawings: 0 }), 0.2);
  assert.equal(cashTotal(null, { customers: 10, added: 0, costs: 1, drawings: 0 }), null);
  const invalid = application(); invalid.periods[0].customers = -1; assert.throws(() => validateAnswers('application', invalid, portal.config));
  assert.throws(() => validateGrade({ criteria: [], integrity: [] }, 'application', {}));
  const strings = JSON.parse(readFileSync(new URL('portal/strings.json', root)));
  for (const [key, entry] of Object.entries(strings)) for (const lang of ['en', 'sw']) assert(entry[lang]?.trim(), `${key}/${lang}`);
  const portalSource = readFileSync(new URL('portal/app.js', root), 'utf8');
  for (const match of portalSource.matchAll(/(?:\bt|\bbutton)\('([^']+)'/g)) assert(strings[match[1]], `Missing portal string: ${match[1]}`);
  const worker = readFileSync(new URL('portal/sw.js', root), 'utf8');
  const assets = [...worker.matchAll(/'((?:\.\/|\.\.\/)[^']+)'/g)].map(m => m[1]).filter(p => p !== './');
  const bytes = assets.reduce((sum, asset) => sum + gzipSync(readFileSync(new URL(asset, new URL('portal/', root)))).length, 0);
  assert(bytes < 60 * 1024, `Portal public assets: ${bytes} compressed bytes`);
  console.log(`Portal translations and asset budget passed (${bytes} compressed bytes).`);
  const config = await api('config'); assert.equal(config.chapters.length, 4);
  await api('me', undefined, undefined, 401); await api('admin/list', undefined, 'bad', 401);
  const request = { requestId: uid(), consent: 1, records: syntheticRecords() };
  await api('claim', { ...request, consent: 0 }, null, 403);
  const partial = copy(request); partial.records[0].observations.splice(0, 2); await api('claim', partial, null, 400);
  const mixed = copy(request); mixed.records[1].localProfileId = 'someone-else'; await api('claim', mixed, null, 400);
  const modified = copy(request); modified.records[0].observations[0].optionId = 'made-up'; await api('claim', modified, null, 400);
  const claim = await api('claim', request); assert.equal(claim.code.length, 24);
  assert.equal((await api('claim', request)).code, claim.code);
  await api('claim', { ...request, requestId: uid() }, null, 409);
  const redemption = { code: claim.code.toUpperCase().match(/.{1,4}/g).join('-'), requestId: uid() };
  const user = await api('redeem', redemption); assert.equal(user.token.length, 64);
  assert.deepEqual(await api('redeem', redemption), user);
  await api('redeem', { ...redemption, requestId: uid() }, null, 409);
  await api('me', undefined, claim.code, 401);
  assert.equal((await api('me', undefined, user.token)).id, user.id);
  await api('draft', { revision: 0, draft: { kind: 'application', answers: {}, step: -1 } }, user.token, 400);
  await api('draft', { revision: 0, draft: { kind: 'application', answers: application(), step: 1 } }, user.token);
  await api('draft', { revision: 0, draft: { kind: 'application', answers: application(), step: 2 } }, user.token, 409);
  assert.equal((await api('me', undefined, user.token)).draft.step, 1);
  const submit = { requestId: uid(), kind: 'application', answers: application(), consent: 1, rules: 1 };
  const submitted = await api('submit', submit, user.token); assert.equal(submitted.status, 'pending');
  assert.equal((await api('submit', submit, user.token)).id, submitted.id);
  await api('submit', { ...submit, answers: { ...submit.answers, business: 'changed' } }, user.token, 409);
  await api('submit', { ...submit, requestId: uid() }, user.token, 409);
  await Promise.all([portal.processNext(), portal.processNext()]); assert.equal(requests.length, 1);
  assert(!JSON.stringify(requests[0]).includes('private-synthetic')); assert(!JSON.stringify(requests[0]).includes('Synthetic game choice'));
  let me = await api('me', undefined, user.token); assert.equal(me.submissions[0].status, 'completed'); assert.equal(me.submissions[0].effective[0].effectiveScore, 3);
  assert.equal(me.submissions[0].checks.at(-1).value, 200);
  const follow = { requestId: uid(), kind: 'followup', answers: { basisAnswer: 'Five paid orders', changeAnswer: 'Need a deposit to buy stock', gameAnswer: 'Check cash before spending', help: 'none', language: 'en' }, consent: 1, rules: 1 };
  await api('submit', follow, user.token); await portal.processNext(); assert(JSON.stringify(requests[1]).includes('Synthetic game choice'));
  await api('submit', { requestId: uid(), kind: 'report2', answers: report('report2'), consent: 1, rules: 1 }, user.token, 400);
  await api('admin/grant', { appId: user.id, date: '2026-01-31', reason: 'Synthetic receipt checked' }, admin);
  await api('admin/grant', { appId: user.id, date: '2026-01-31', reason: 'duplicate' }, admin, 409);
  await api('submit', { requestId: uid(), kind: 'report2', answers: report('report2'), consent: 1, rules: 1 }, user.token, 400);
  time = new Date('2026-03-31T12:00:00Z');
  const r2 = await api('submit', { requestId: uid(), kind: 'report2', answers: report('report2'), consent: 1, rules: 1 }, user.token);
  await portal.processNext(); me = await api('me', undefined, user.token);
  assert.equal(me.submissions.find(s => s.id === r2.id).checks[1].value, -5);
  const correction = { requestId: uid(), kind: 'report2', answers: { ...report('report2'), closingCash: 1120 }, correctionOf: r2.id, correctionReason: 'Corrected a transcription error', consent: 1, rules: 1 };
  const r2v2 = await api('submit', correction, user.token); await portal.processNext();
  await api('submit', { ...correction, requestId: uid() }, user.token, 409);
  me = await api('me', undefined, user.token); assert.equal(me.submissions.find(s => s.id === r2.id).answers.closingCash, 1115);
  assert.equal(me.submissions.find(s => s.id === r2v2.id).checks[1].code, 'balanced');
  time = new Date('2026-07-31T12:00:00Z');
  await api('submit', { requestId: uid(), kind: 'report6', answers: report('report6'), consent: 1, rules: 1 }, user.token, 400);
  await api('submit', { requestId: uid(), kind: 'report4', answers: report('report4'), consent: 1, rules: 1 }, user.token); await portal.processNext();
  const r6 = await api('submit', { requestId: uid(), kind: 'report6', answers: report('report6'), consent: 1, rules: 1 }, user.token); await portal.processNext();
  me = await api('me', undefined, user.token); const final = me.submissions.find(s => s.id === r6.id);
  assert.equal(final.context.previousReports[0].version, 2); assert.equal(final.context.original.periods[0].customers, 50); assert.equal(final.recommendation, 'ready');
  const integrity = { appId: user.id, submissionId: submitted.id, criterion: 'forecast', action: 'confirm', reason: 'Synthetic admission reviewed', evidence: [{ path: 'answer.help', quote: 'ai_answers' }] };
  await api('admin/integrity', { ...integrity, evidence: [{ path: 'answer.help', quote: 'invented' }] }, admin, 400);
  await api('admin/integrity', integrity, admin);
  me = await api('me', undefined, user.token); const penalised = me.submissions[0];
  assert.equal(penalised.effective.find(c => c.id === 'forecast').effectiveScore, 0); assert.equal(penalised.grades[0].result.criteria[0].score, 3);
  await api('admin/integrity', integrity, admin, 409);
  await api('appeal', { findingId: penalised.findings[0].id, text: 'Synthetic correction: I meant typing assistance.' }, user.token);
  await api('admin/integrity', { ...integrity, action: 'reverse', reason: 'Synthetic permitted assistance confirmed' }, admin);
  assert.equal((await api('me', undefined, user.token)).submissions[0].effective[0].effectiveScore, 3);
  await api('admin/decision', { appId: user.id, action: 'hold', reason: 'Synthetic follow-up required' }, admin);
  const before = await api('me', undefined, user.token); assert.equal(before.decisions.at(-1).action, 'hold');
  providerMode = 'bad'; await api('admin/regrade', { appId: user.id, submissionId: r6.id }, admin);
  for (let i = 0; i < 3; i++) { await portal.processNext(); time = new Date(time.getTime() + 100000); }
  const bad = (await api('me', undefined, user.token)).submissions.find(s => s.id === r6.id);
  assert.equal(bad.status, 'unavailable'); assert.equal(bad.grades.length, 4); assert.equal(bad.grades.filter(g => g.status === 'completed').length, 1);
  assert.equal(bad.recommendation, 'needs_evidence');
  const originalRecipient = portal.config.aiRecipient, sentBeforeChange = requests.length;
  portal.config.aiRecipient = 'A different recipient';
  await api('admin/regrade', { appId: user.id, submissionId: r6.id }, admin);
  await portal.processNext(); assert.equal(requests.length, sentBeforeChange, 'Do not send old consent to a new recipient');
  portal.config.aiRecipient = originalRecipient;
  providerMode = 'ok'; await api('admin/regrade', { appId: user.id, submissionId: r6.id }, admin); await portal.processNext();
  const recovered = await api('admin/recovery', { appId: user.id, reason: 'Synthetic recovery request independently checked' }, admin);
  await api('me', undefined, user.token, 401); await api('redeem', redemption, null, 409);
  assert.equal((await api('export', undefined, recovered.token)).records.length, 4);
  // An expired claim cannot be redeemed; no record or contact leaks through errors.
  const oldClaim = await api('claim', { requestId: uid(), records: syntheticRecords('-expired'), consent: 1 });
  time = new Date(time.getTime() + 31 * 86400000);
  await api('redeem', { code: oldClaim.code, requestId: uid() }, null, 400);
  const crossOrigin = await fetch(base + '/api/portal/draft', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.invalid', Authorization: 'Bearer ' + recovered.token }, body: '{}' });
  assert.equal(crossOrigin.status, 403);
  assert.equal((await fetch(base + '/portal/server.mjs')).status, 404);
  assert.equal((await fetch(base + '/learner-data/portal.sqlite')).status, 404);
  await api('delete', { confirm: user.id }, recovered.token);
  await api('me', undefined, recovered.token, 401); assert.equal(portal.db.prepare('SELECT count(*) AS n FROM submissions').get().n, 0);
  console.log(`Portal API: ${checks} requests checked; code reuse, isolation, cash, reports, grading, penalties, recovery and deletion passed.`);
  if (!process.argv.includes('--no-browser')) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', ...(process.env.PORTAL_TEST_LOW_THREADS ? ['--no-zygote', '--single-process', '--disable-gpu', '--disable-software-rasterizer'] : [])] });
    try {
      const context = await browser.newContext({ viewport: { width: 320, height: 780 }, acceptDownloads: true });
      const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/portal/'); await page.getByRole('button', { name: 'Check my chapters', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Kiswahili', exact: true }).click(); await page.getByRole('button', { name: 'Angalia sura zangu', exact: true }).waitFor();
      await page.getByRole('button', { name: 'English', exact: true }).click();
      const browserClaim = await api('claim', { requestId: uid(), records: syntheticRecords('-browser'), consent: 1 });
      await page.locator('input[name=entryCode]').fill(browserClaim.code); await page.locator('form').filter({ has: page.locator('input[name=entryCode]') }).getByRole('button').click();
      await page.getByRole('button', { name: 'I have kept my key', exact: true }).click();
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await page.locator('[name=business]').fill('Synthetic browser business'); await page.locator('[name=customer]').fill('Five buyers');
      await page.getByRole('button', { name: 'Save and leave', exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
      const backupDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download a copy from this phone', exact: true }).click();
      const backupPath = join(temp, 'synthetic-browser-backup.json'); await (await backupDownload).saveAs(backupPath);
      await page.getByRole('button', { name: 'Sign out of this phone', exact: true }).click();
      await page.getByRole('heading', { name: 'Sign out of this phone', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Sign out of this phone', exact: true }).click();
      await page.getByLabel('Restore a saved backup', { exact: true }).setInputFiles(backupPath);
      await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
      await context.setOffline(true); await page.reload();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      assert.equal(await page.locator('[name=business]').inputValue(), 'Synthetic browser business');
      await page.locator('summary').first().click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('[name=action]').fill('Try five paid orders'); await page.locator('[name=success]').fill('Five paid orders');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('[name=openingCash]').fill('100');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      for (let i = 0; i < 3; i++) {
        await page.locator(`[name="periods.${i}.customers"]`).fill('50'); await page.locator(`[name="periods.${i}.costs"]`).fill('20');
        await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
      await page.locator('[name=basis]').fill('Orders from five buyers'); await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('[name=spendItem]').fill('Stock'); await page.locator('[name=spendAmount]').fill('800'); await page.locator('[name=grantReason]').fill('Fill orders');
      assert.match(await page.locator('#reserve').innerText(), /200/); await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('[name=risk]').fill('Late payment'); await page.locator('[name=response]').fill('Deposit'); await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('[name=records]').fill('Notebook'); await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('input[type=checkbox]').nth(0).check(); await page.locator('input[type=checkbox]').nth(1).check();
      await page.getByRole('button', { name: 'Send to the programme', exact: true }).click();
      await page.getByRole('button', { name: 'Try again', exact: true }).first().waitFor();
      await page.reload(); await page.getByText(/Waiting to send/).first().waitFor();
      // The POST is accepted but the following account refresh is lost. The outbox must survive.
      let droppedReceipt = false;
      await context.route('**/api/portal/me', route => { if (!droppedReceipt) { droppedReceipt = true; return route.abort(); } return route.continue(); });
      await context.setOffline(false);
      await page.getByText('The application service cannot be reached. Try again when connected.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Try again', exact: true }).first().click();
      await page.getByRole('heading', { name: 'Your business idea', exact: true }).waitFor();
      await context.unroute('**/api/portal/me');
      assert.equal(portal.db.prepare("SELECT count(*) AS n FROM submissions WHERE kind='application'").get().n, 1);
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await page.locator('[name=basisAnswer]').fill('Five orders'); await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('[name=changeAnswer]').fill('Ask for a deposit'); await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('[name=gameAnswer]').fill('Check cash first');
      assert.match(await page.locator('.compare').innerText(), /Synthetic game choice/); await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('input[type=checkbox]').nth(0).check(); await page.locator('input[type=checkbox]').nth(1).check();
      await page.getByRole('button', { name: 'Send to the programme', exact: true }).click();
      await page.getByRole('heading', { name: 'Two checks and a game question', exact: true }).waitFor();
      const browserApp = (await api('admin/list', undefined, admin))[0];
      await api('admin/grant', { appId: browserApp.id, date: time.toISOString().slice(0, 10), reason: 'Synthetic browser grant' }, admin);
      await page.getByRole('button', { name: 'Back', exact: true }).click(); await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await page.getByText(/This report opens on/).waitFor();
      time = new Date(addMonths(time.toISOString().slice(0, 10), 6) + 'T12:00:00Z');
      await page.clock.setFixedTime(time);
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      for (const kind of ['report2', 'report4', 'report6']) {
        await page.getByRole('button', { name: 'Start', exact: true }).click();
        const fields = [
          { openingCash: '100', customers: '50', costs: '20' },
          { added: '1000', drawings: '10', closingCash: '1120' },
          { wentWell: 'Five customers paid', wentWrong: 'One delivery was late' },
          { why: 'Supplier delivered late' }, { changed: 'Asked for earlier delivery', result: 'Next order arrived on time' },
          { nextAction: 'Check delivery dates', ...(kind === 'report6' ? { learned: 'Ask before promising a date' } : { nextCustomers: '60', nextCosts: '25' }) },
          ...(kind === 'report6' ? [{ bottleneck: 'Stock for paid orders', nextGrantUse: 'Fill confirmed orders' }] : []),
          { evidenceNote: 'Synthetic notebook' },
        ];
        for (const values of fields) {
          for (const [key, value] of Object.entries(values)) await page.locator(`[name="${key}"]`).fill(value);
          if ('evidenceNote' in values && kind === 'report6') {
            const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 10; return c.toDataURL().split(',')[1]; });
            await page.locator('input[type=file]').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
            await page.getByRole('img').waitFor();
          }
          await page.getByRole('button', { name: 'Next', exact: true }).click();
        }
        await page.locator('input[type=checkbox]').nth(0).check(); await page.locator('input[type=checkbox]').nth(1).check();
        if (kind === 'report6') await page.locator('input[type=checkbox]').nth(2).check();
        await page.getByRole('button', { name: 'Send to the programme', exact: true }).click();
        await page.getByRole('heading', { name: { report2: 'Your first report', report4: 'Your second report', report6: 'Your final report' }[kind], exact: true }).waitFor();
        await page.getByRole('button', { name: 'Back', exact: true }).click();
      }
      assert.equal(portal.db.prepare("SELECT count(*) AS n FROM submissions WHERE kind LIKE 'report%'").get().n, 3);
      await page.getByRole('heading', { name: 'Your business', exact: true }).waitFor();
      await page.addStyleTag({ content: 'html { font-size: 36px !important; }' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const sizes = await page.locator('button:visible').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().height < 47).map(n => n.textContent)); assert.deepEqual(sizes, []);
      const cachedAPIs = await page.evaluate(async () => {
        const urls = []; for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) if (new URL(req.url).pathname.startsWith('/api/')) urls.push(req.url); return urls;
      }); assert.deepEqual(cachedAPIs, []);
      assert.deepEqual(errors, []);
      console.log('Portal browser: bilingual steps, offline resume, backup restore, lost receipt retry, follow-ups, all three reports, photo, 320px/200% text and private-cache boundary passed.');
      // Check reviewer controls on the same synthetic account.
      while (await portal.processNext()) {}
      await page.goto(base + '/portal/?review');
      await page.locator('input[type=password]').fill(admin); await page.locator('form button[type=submit]').click();
      await page.getByRole('button', { name: 'View', exact: true }).click();
      await page.getByRole('button', { name: 'Six-month decision', exact: true }).click();
      await page.locator('[name=action]').selectOption('hold'); await page.locator('[name=reason]').fill('Synthetic browser review needs one more check');
      await page.locator('form button[type=submit]').click();
      await page.getByText(/Synthetic browser review needs one more check/).waitFor();
      // Sign out locally, then exercise the real game-to-portal path and both workers.
      await page.goto(base + '/portal/');
      await page.getByRole('button', { name: 'Sign out of this phone', exact: true }).click();
      await page.getByRole('heading', { name: 'Sign out of this phone', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Sign out of this phone', exact: true }).click();
      await page.getByRole('button', { name: 'Check my chapters', exact: true }).waitFor();
      const { session, advance } = await import('./lib/browser.mjs');
      await page.goto(base + '/'); await page.locator('.chapter-card').first().click();
      for (let chapter = 0; chapter < 4; chapter++) {
        await page.locator('.episode-progress').waitFor();
        for (let step = 0; step < 180; step++) { if ((await session(page))?.completed) break; await advance(page); }
        assert((await session(page)).completed, `Real chapter ${chapter + 1} completed`);
        if (chapter < 3) await page.locator('.chapter-transition .btn-primary').click();
      }
      await page.locator('#programme-portal').click();
      await page.getByRole('button', { name: 'Check my chapters', exact: true }).click();
      await page.locator('select').nth(3).waitFor();
      assert.equal(await page.locator('select').count(), 4);
      await page.locator('input[type=checkbox]').check(); await page.locator('form button[type=submit]').click();
      await page.getByRole('heading', { name: 'Your entry code is ready', exact: true }).waitFor();
      assert.equal((await page.locator('code').innerText()).replaceAll('-', '').length, 24);
      const cacheLeaks = await page.evaluate(async () => {
        const paths = []; for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) if (new URL(req.url).pathname.startsWith('/api/')) paths.push(req.url); return paths;
      }); assert.deepEqual(cacheLeaks, []); assert.deepEqual(errors, []);
      console.log('Portal integration: reviewer decision, four real chapters, completion link, record claim and combined service-worker privacy passed.');
    } catch (error) { console.error('Browser pages:', await Promise.all(browser.contexts().flatMap(c => c.pages()).map(p => p.locator('body').innerText().catch(() => 'unavailable')))); throw error; } finally { await browser.close(); }
  }
} finally {
  await portal.close(); await new Promise(r => provider.close(r)); rmSync(temp, { recursive: true, force: true });
}
