import { loadStrings, setLanguage, getLanguage, localised, t } from '../js/i18n.js';
import { VERSION, CRITERIA, MONEY, OPTIONAL_MONEY, HELP, blankAnswers, validateAnswers, validateDraft, financialChecks, cashTotal } from './model.js';

const view = document.querySelector('#view'), status = document.querySelector('#status');
let state = {}, db, revision = 0, saving = Promise.resolve(), sending = false, adminKey = '';
const reviewMode = new URLSearchParams(location.search).has('review');
const clone = x => JSON.parse(JSON.stringify(x));
const el = (tag, text, className) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; };
const button = (key, fn, cls = '') => { const b = el('button', t(key), cls); b.type = 'button'; b.onclick = () => Promise.resolve().then(fn).catch(showError); return b; };
const group = (...nodes) => { const n = el('div', undefined, 'actions'); n.append(...nodes); return n; };
const money = value => value === null || value === undefined ? t('unknown') : new Intl.NumberFormat(getLanguage() === 'sw' ? 'sw-TZ' : 'en', { style: 'currency', currency: state.config.currency, maximumFractionDigits: 2 }).format(value);
const date = iso => new Intl.DateTimeFormat(getLanguage() === 'sw' ? 'sw-TZ' : 'en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso));
const latest = kind => state.account?.submissions.filter(s => s.kind === kind).sort((a, b) => b.version - a.version)[0];
const setStatus = (message, error = false) => { status.textContent = message; status.classList.toggle('error', error); };
const showError = error => setStatus(t(`error.${error.code || 'serverError'}`) === `error.${error.code || 'serverError'}` ? t('serviceUnavailable') : t(`error.${error.code || 'serverError'}`), true);
const uid = () => crypto.randomUUID().replaceAll('-', '');
const groupedKey = key => key.match(/.{1,8}/g)?.join('-') || key;
function startView(title, hint = '') { view.replaceChildren(el('h1', title)); if (hint) view.append(el('p', hint)); view.focus(); window.scrollTo(0, 0); }
function fieldLabel(path, actual = false) { const key = path.split('.').at(-1); return t(`${actual && MONEY.includes(key) ? 'actual' : 'field'}.${key}`); }
function at(object, path) { return path.split('.').reduce((a, key) => a?.[key], object); }
function put(object, path, value) { const keys = path.split('.'); const key = keys.pop(); keys.reduce((o, k) => o[k], object)[key] = value; }
function info(parent) {
  parent.append(el('p', t('aiRecipient', { recipient: state.config.aiRecipient || t('sampleAI') }), 'hint'));
  parent.append(el('p', t('consentInfo', { recipient: state.config.recipient || t('sampleRecipient'), days: state.config.retentionDays, contact: state.config.contact || t('sampleContact') }), 'hint'));
}
function checkbox(parent, key) {
  const label = el('label', undefined, 'check'), input = el('input'); input.type = 'checkbox'; input.required = true;
  label.append(input, el('span', t(key))); parent.append(label); return input;
}
function download(value, suffix = 'records') {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = el('a'); a.href = url; a.download = `MV-BS-PORTAL-${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function openStorage() {
  db = await new Promise((resolve, reject) => {
    const r = indexedDB.open('business-portal', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('state');
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
  const stored = await new Promise((resolve, reject) => { const r = db.transaction('state').objectStore('state').get('current'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  if (stored) { state = stored.data; revision = stored.revision; }
}
function save(show = true) {
  const snapshot = clone(state);
  const operation = saving.then(() => new Promise((resolve, reject) => {
    if (!db) return reject(new Error('storage'));
    const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state'), r = store.get('current');
    let conflict = false;
    r.onsuccess = () => {
      if ((r.result?.revision || 0) !== revision) { conflict = true; tx.abort(); return; }
      store.put({ revision: revision + 1, data: snapshot }, 'current');
    };
    tx.oncomplete = () => { revision++; resolve(true); };
    tx.onerror = tx.onabort = () => reject(Object.assign(new Error('storage'), { code: conflict ? 'storageConflict' : 'storage' }));
  }));
  saving = operation.catch(() => false);
  return operation.then(() => { if (show) setStatus(t(state.outbox || state.claim?.pending ? 'waiting' : 'savedLocal')); return true; }).catch(e => { setStatus(t(e.code === 'storageConflict' ? 'error.storageConflict' : 'saveFailed'), true); return false; });
}
async function api(path, body, token = state.token) {
  let response;
  try {
    response = await fetch(`/api/portal/${path}`, { method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000), cache: 'no-store' });
  } catch { throw Object.assign(new Error('network'), { code: 'serviceUnavailable' }); }
  let result;
  try { result = await response.json(); } catch { throw Object.assign(new Error('network'), { code: 'serviceUnavailable' }); }
  if (!response.ok) throw Object.assign(new Error(result.error), { code: result.error, field: result.field });
  return result;
}
async function refresh() { state.account = await api('me'); state.id = state.account.id; state.config = state.account.config; await save(false); }
function render() {
  document.title = t('title'); document.querySelector('#brand').textContent = t(reviewMode ? 'adminTitle' : 'title');
  document.querySelector('#home').setAttribute('aria-label', t('home'));
  document.querySelector('#notice').textContent = state.config?.testMode ? t('testMode') : getLanguage() === 'sw' ? t('unreviewed') : '';
  const language = document.querySelector('#language'); language.replaceChildren();
  for (const [code, label] of [['en', 'English'], ['sw', 'Kiswahili']]) {
    const b = el('button', label, 'small'); b.type = 'button'; b.setAttribute('aria-pressed', String(getLanguage() === code));
    b.onclick = async () => { state.language = code; setLanguage(code); await save(false); render(); }; language.append(b);
  }
  if (!state.config) return unavailable();
  if (reviewMode) return adminEntry();
  if (!state.token) return entry();
  if (!state.keyKept) return keyView();
  if (state.editing && state.drafts?.[state.editing]) return editForm();
  home();
}
function unavailable() { startView(t('serviceUnavailable')); view.append(button('retry', async () => { state.config = await api('config', undefined, ''); await save(false); render(); })); }
function entry() {
  startView(t('entryTitle'), t('entryText'));
  if (state.claim?.code) {
    const card = el('div', undefined, 'card'); card.append(el('h2', t('codeReady')), el('code', groupedKey(state.claim.code)), el('p', t('keepCode')), el('p', t('expires', { date: date(state.claim.expires) })));
    card.append(button('useCode', () => redeem(state.claim.code), 'primary')); view.append(card);
  } else if (state.claim?.pending) view.append(el('p', t('waiting')), button('retry', claimSaved, 'primary'));
  else view.append(button('checkChapters', checkChapters, 'primary'));
  const filesLabel = el('label', t('importRecords')), files = el('input'); files.type = 'file'; files.multiple = true; files.accept = '.json,application/json'; filesLabel.append(files);
  files.onchange = async () => {
    try {
      let records = [];
      for (const file of files.files) {
        if (file.size > 2400000) throw { code: 'tooLarge' };
        const r = JSON.parse(await file.text()); records.push(...(Array.isArray(r) ? r : [r]));
      }
      chooseRecords(records);
    } catch (e) { showError(e.code ? e : { code: 'recordUnsupported' }); }
  };
  view.append(filesLabel, el('p', t('importHint'), 'hint'));
  for (const returning of [false, true]) {
    const form = el('form'); form.append(el('h2', t(returning ? 'returning' : 'codeLabel')));
    const label = el('label', t(returning ? 'returnLabel' : 'codeLabel')), input = el('input');
    input.required = true; input.autocomplete = 'off'; input.spellcheck = false; input.type = returning ? 'password' : 'text'; input.name = returning ? 'returnKey' : 'entryCode'; label.append(input);
    const submit = el('button', t(returning ? 'signIn' : 'useCode'), 'primary'); submit.type = 'submit'; form.append(label, submit);
    form.onsubmit = async e => { e.preventDefault(); submit.disabled = true; try { if (returning) await signIn(input.value); else await redeem(input.value); } catch (err) { showError(err); submit.disabled = false; } };
    view.append(form);
  }
  const restoreLabel = el('label', t('restoreBackup')), restore = el('input'); restore.type = 'file'; restore.accept = '.json,application/json'; restoreLabel.append(restore);
  restore.onchange = async () => {
    try {
      const file = restore.files[0]; if (!file || file.size > 4000000) throw { code: 'tooLarge' };
      const backup = JSON.parse(await file.text());
      if (typeof backup.token !== 'string' || !/^[a-f0-9]{64}$/.test(backup.token)) throw { code: 'invalid' };
      const account = await api('me', undefined, backup.token), drafts = {};
      for (const d of Object.values(backup.drafts || {})) { const clean = validateDraft(d, account.config); drafts[clean.kind] = clean; }
      let outbox = null;
      if (backup.outbox) {
        const o = backup.outbox;
        if (o.appId !== account.id || !/^[A-Za-z0-9_-]{24,100}$/.test(o.requestId) || o.consent !== VERSION || o.rules !== VERSION) throw { code: 'invalid' };
        outbox = { ...o, answers: validateAnswers(o.kind, o.answers, account.config) };
      }
      state = { token: backup.token, id: account.id, account, config: account.config, drafts, outbox, keyKept: true, language: getLanguage() };
      if (await save(false)) render();
    } catch (e) { showError(e.code ? e : { code: 'invalid' }); }
  };
  view.append(restoreLabel, el('p', t('restoreHint'), 'hint'));
  info(view);
}
async function checkChapters() {
  const storage = await import('../js/storage.js'); await storage.init();
  const entries = await storage.backup(true);
  chooseRecords(entries.filter(([key, s]) => key.startsWith('attempt:') && s.completed).map(([, s]) => ({ schemaVersion: 2, attemptId: s.id,
    localProfileId: s.profileId, scenarioVersion: s.record.scenarioVersion, calculationVersion: s.record.calculationVersion,
    scenarioId: s.scenarioId, completed: true, observations: s.record.observations })));
}
function chooseRecords(records) {
  startView(t('checkChapters'));
  const form = el('form'), selected = [];
  state.config.chapters.forEach(chapter => {
    const options = records.filter(r => r.scenarioId === chapter.id && r.completed === true);
    const label = el('label', localised(chapter.title)); form.append(label);
    if (!options.length) { form.append(el('p', t('notComplete'))); return; }
    const select = el('select'); select.setAttribute('aria-label', `${localised(chapter.title)} — ${t('chooseAttempt')}`);
    options.forEach((r, i) => { const option = el('option', `${t('complete')} · ${r.attemptId.slice(-8)}`); option.value = String(i); select.append(option); });
    selected.push(() => options[Number(select.value)]); form.append(select);
  });
  info(form); const consent = checkbox(form, 'consentRecords');
  const send = el('button', t('getCode'), 'primary'); send.type = 'submit'; send.disabled = selected.length !== state.config.chapters.length;
  form.append(group(send, button('back', entry)));
  form.onsubmit = async e => { e.preventDefault(); if (!consent.checked) return;
    state.claim = { requestId: uid(), records: selected.map(fn => fn()), pending: true, consent: VERSION };
    if (!await save()) return; await claimSaved();
  };
  view.append(form);
}
async function claimSaved() {
  if (sending || !state.claim?.pending) return;
  sending = true;
  try { Object.assign(state.claim, await api('claim', state.claim, ''), { pending: false }); await save(false); entry(); }
  catch (e) { showError(e); } finally { sending = false; }
}
async function redeem(code) {
  state.redeem ||= { requestId: uid(), code };
  if (state.redeem.code !== code) state.redeem = { requestId: uid(), code };
  if (!await save(false)) return;
  const result = await api('redeem', state.redeem, '');
  Object.assign(state, { token: result.token, id: result.id, keyKept: false, editing: null, drafts: {} });
  if (!await save(false)) { keyView(); return; }
  await refresh(); render();
}
async function signIn(token) {
  const cleaned = token.replace(/[\s-]/g, '').toLowerCase();
  const account = await api('me', undefined, cleaned);
  Object.assign(state, { token: cleaned, id: account.id, account, config: account.config, keyKept: true, drafts: state.id === account.id ? state.drafts || {} : {}, editing: null });
  await save(false); render();
}
function keyView() {
  startView(t('keepKey'), t('keyHint'));
  view.append(el('code', groupedKey(state.token)), button('backup', () => download(state, 'backup')),
    button('keySaved', async () => { state.keyKept = true; await save(false); home(); }, 'primary'));
}
function home() {
  startView(t('title'));
  if (!state.account) { view.append(button('retry', async () => { await refresh(); home(); })); return; }
  if (state.outbox) view.append(el('p', t('waiting')), button('retry', sendOutbox, 'primary'));
  const app = latest('application'), followup = latest('followup');
  if (!state.outbox) {
    const nextKind = !app ? 'application' : !followup ? 'followup' : state.account.periods.find(p => !latest(p.kind))?.kind;
    if (nextKind) {
      const period = state.account.periods.find(p => p.kind === nextKind);
      const card = el('div', undefined, 'card'); card.append(el('p', t('nextAction'), 'step'), el('h2', t(nextKind)));
      if (period) card.append(el('p', t('reportDates', { from: date(period.from), due: date(period.due) })));
      if (!period || new Date().toISOString().slice(0, 10) >= period.due) card.append(button(state.drafts?.[nextKind] ? 'continue' : 'start', () => startDraft(nextKind), 'primary'));
      else card.append(el('p', t('notDue', { date: date(period.due) })));
      view.append(card);
    } else if (!state.account.grant) view.append(el('p', t('awaitingGrant'), 'card'));
  }
  if (state.account.draft && !state.drafts?.[state.account.draft.kind]) view.append(button('useServerDraft', async () => {
    const d = validateDraft(state.account.draft, state.config); state.drafts ||= {}; state.drafts[d.kind] = d; state.editing = d.kind; await save(); editForm();
  }));
  if (state.account.submissions.length) {
    view.append(el('h2', t('pastReports')));
    for (const kind of ['application', 'followup', 'report2', 'report4', 'report6']) {
      const sub = latest(kind); if (!sub) continue;
      const card = el('div', undefined, 'card'); card.append(el('h2', t(kind)), el('p', t(`grade.${sub.status}`)), button('view', () => sentView(sub)));
      view.append(card);
    }
  }
  const decision = state.account.decisions.filter(d => ['progress', 'hold', 'not_ready'].includes(d.action)).at(-1);
  if (decision) view.append(el('h2', t(decision.action === 'not_ready' ? 'not_readyDecision' : decision.action)), el('p', decision.reason));
  const details = el('details'); details.append(el('summary', t('keepKey')), el('code', groupedKey(state.token)), el('p', t('keyHint'))); view.append(details);
  view.append(group(button('retry', async () => { await refresh(); home(); }), button('export', async () => download(await api('export'))), button('backup', () => download(state, 'backup')), button('signOut', signOut), button('delete', deleteView, 'danger')));
}
async function signOut() {
  startView(t('signOut'), t('signOutHint'));
  view.append(group(button('backup', () => download(state, 'backup')), button('signOut', async () => {
    state = { config: state.config, language: getLanguage() };
    if (await save(false)) { setStatus(''); entry(); }
  }, 'primary'), button('cancel', home)));
}
function deleteView() {
  startView(t('delete'), t('deleteHint'));
  view.append(group(button('export', async () => download(await api('export'))), button('confirmDelete', async () => {
    await api('delete', { confirm: state.id }); state = { config: state.config, language: getLanguage() }; await save(false); entry();
  }, 'danger'), button('cancel', home)));
}
async function startDraft(kind, correction) {
  if (state.outbox) return;
  state.drafts ||= {};
  if (correction) state.drafts[kind] = { kind, answers: clone(correction.answers), step: 0, correctionOf: correction.id, correctionReason: '' };
  if (!state.drafts[kind]) {
    const answers = blankAnswers(kind, state.config, getLanguage());
    if (kind.startsWith('report')) {
      const prev = latest(`report${Number(kind.slice(6)) - 2}`);
      answers.openingCash = prev?.answers.closingCash ?? latest('application')?.answers.openingCash ?? null;
      answers.added = kind === 'report2' ? state.account.grant.amount : 0;
      answers.drawings = 0;
    }
    state.drafts[kind] = { kind, answers, step: 0 };
  }
  state.editing = kind; await save(); editForm();
}
function stepsFor(draft) {
  const kind = draft.kind;
  if (kind === 'application') return [
    { title: 'application', fields: ['business', 'customer', 'stage'], example: 'business' },
    { title: 'field.action', fields: ['action', 'success'], example: 'action' },
    { title: 'field.openingCash', fields: ['openingCash'], example: 'money', details: true },
    ...[0, 1, 2].map(i => ({ title: 'forecastTitle', period: i, fields: MONEY.map(k => `periods.${i}.${k}`), example: 'money' })),
    { title: 'field.basis', fields: ['basis'], example: 'basis' },
    { title: 'field.spendItem', fields: ['spendItem', 'spendAmount', 'grantReason'], example: 'grant' },
    { title: 'field.risk', fields: ['risk', 'response'], example: 'risk' },
    { title: 'field.records', fields: ['records', 'contact', 'help'], example: 'records' },
    { review: true },
  ];
  if (kind === 'followup') return [
    { title: 'field.basisAnswer', fields: ['basisAnswer'], prompt: 'basisPrompt', example: 'basis' },
    { title: 'field.changeAnswer', fields: ['changeAnswer'], prompt: 'changePrompt', example: 'reflection' },
    { title: 'field.gameAnswer', fields: ['gameAnswer', 'help'], prompt: 'gamePrompt', example: 'reflection' }, { review: true },
  ];
  return [
    ...(draft.correctionOf ? [{ title: 'correctionReason', correction: true, fields: [] }] : []),
    { title: 'moneyTitle', fields: ['openingCash', 'customers', 'costs'], example: 'money' },
    { title: 'field.closingCash', fields: ['added', 'drawings', 'closingCash', 'source'], example: 'money', details: true },
    { title: 'field.wentWell', fields: ['wentWell', 'wentWrong'], example: 'reflection' },
    { title: 'field.why', fields: ['why'], example: 'reflection' },
    { title: 'field.changed', fields: ['changed', 'result'], example: 'reflection' },
    { title: 'field.nextAction', fields: ['nextAction', ...(kind === 'report6' ? ['learned'] : ['nextCustomers', 'nextCosts'])], example: 'action' },
    ...(kind === 'report6' ? [{ title: 'field.bottleneck', fields: ['bottleneck', 'nextGrantUse'], example: 'grant' }] : []),
    { title: 'field.evidenceNote', fields: ['evidenceNote', 'help'], photo: true, example: 'records' }, { review: true },
  ];
}
const moneyKeys = new Set([...MONEY, ...OPTIONAL_MONEY, 'openingCash', 'closingCash', 'spendAmount', 'nextCustomers', 'nextCosts']);
function control(parent, path, draft) {
  const key = path.split('.').at(-1), a = draft.answers;
  const options = key === 'help' ? HELP : key === 'stage' ? ['testing', 'trading'] : key === 'source' ? ['records', 'estimate', 'mixed'] : null;
  const input = el(options ? 'select' : moneyKeys.has(key) || key === 'contact' ? 'input' : 'textarea');
  const id = `answer-${path.replaceAll('.', '-')}`;
  const label = el('label', fieldLabel(path, draft.kind.startsWith('report'))); label.htmlFor = id;
  input.id = id; input.name = path;
  if (options) options.forEach(value => { const op = el('option', t(key === 'stage' ? value : `${key}.${value}`)); op.value = value; input.append(op); });
  else if (moneyKeys.has(key)) { input.type = 'number'; input.inputMode = 'decimal'; input.min = '0'; input.max = '1000000000000'; input.step = '0.01'; }
  else { input.maxLength = key === 'contact' ? 160 : 2000; if (key === 'contact') input.autocomplete = 'off'; }
  input.required = ['business', 'customer', 'action'].includes(path);
  input.value = at(a, path) ?? '';
  input.oninput = () => {
    const value = moneyKeys.has(key) ? input.value === '' ? null : Number(input.value) : input.value;
    put(a, path, value); save();
    if (key === 'spendAmount') document.querySelector('#reserve').textContent = t('reserveLabel', { amount: money(state.config.grantAmount - (a.spendAmount || 0)) });
  };
  parent.append(label, input);
  if (moneyKeys.has(key)) parent.append(el('p', t('unknownHint'), 'hint'));
  if (key === 'contact') parent.append(el('p', t('contactHint'), 'hint'));
}
function showChecks(parent, kind, answers) {
  const details = el('details'); details.append(el('summary', t('checks')));
  for (const check of financialChecks(kind, answers, state.config)) details.append(el('p', t(`check.${check.code}`, { amount: money(check.value) })));
  parent.append(details);
}
function editForm() {
  const draft = state.drafts[state.editing], steps = stepsFor(draft); draft.step = Math.max(0, Math.min(draft.step, steps.length - 1));
  const step = steps[draft.step];
  if (step.review) return reviewForm(draft, steps);
  const title = step.period === undefined ? t(step.title) : t('forecastTitle', { period: t('period', { from: step.period * 2 + 1, to: step.period * 2 + 2 }) });
  startView(title, t('shortAnswers'));
  view.append(el('p', t('step', { n: draft.step + 1, total: steps.length }), 'step'));
  const period = state.account.periods.find(p => p.kind === draft.kind);
  if (period) view.append(el('p', t('reportDates', { from: date(period.from), due: date(period.due) }), 'hint'));
  const form = el('form');
  if (step.prompt) form.append(el('p', t(step.prompt, { amount: money(latest('application')?.answers.periods[0].customers), choice: state.account.game?.chosen || '' }), 'compare'));
  if (draft.kind.startsWith('report') && draft.step === 2) {
    const expected = latest('application')?.answers.periods[Number(draft.kind.slice(6)) / 2 - 1]?.customers;
    form.append(el('p', t('compare', { expected: money(expected), actual: money(draft.answers.customers) }), 'compare'));
  }
  if (step.period !== undefined) form.append(el('p', t('moneyHint'), 'hint'));
  if (step.fields.includes('spendAmount')) form.append(el('p', t('grantBudget', { amount: money(state.config.grantAmount) })));
  for (const field of step.fields) control(form, field, draft);
  if (step.fields.includes('spendAmount')) { const reserve = el('p', t('reserveLabel', { amount: money(state.config.grantAmount - draft.answers.spendAmount) })); reserve.id = 'reserve'; form.append(reserve); }
  if (step.correction) {
    const input = el('textarea'); input.required = true; input.maxLength = 1000; input.value = draft.correctionReason;
    input.setAttribute('aria-label', t('correctionReason')); input.oninput = () => { draft.correctionReason = input.value; save(); };
    form.append(el('p', t('originalKept')), input);
  }
  if (step.details) {
    const details = el('details'); details.append(el('summary', t('moreMoney')));
    for (const key of OPTIONAL_MONEY) control(details, key, draft); form.append(details);
  }
  if (step.photo) photoControl(form, draft);
  if (step.example) { const help = el('details'); help.append(el('summary', t('example')), el('p', t(`example.${step.example}`))); form.append(help); }
  const next = el('button', t('next'), 'primary'); next.type = 'submit';
  const back = button('back', async () => { draft.step--; await save(false); editForm(); }); back.disabled = draft.step === 0;
  form.append(group(next, back, button('saveLeave', async () => { state.editing = null; await save(); home(); })));
  form.onsubmit = async e => { e.preventDefault(); if (!form.checkValidity()) return form.reportValidity(); draft.step++; await save(); editForm(); };
  view.append(form);
}
async function compressPhoto(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 10000000) throw { code: 'photo' };
  const url = URL.createObjectURL(file), img = new Image();
  try {
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    if (img.naturalWidth * img.naturalHeight > 30000000) throw { code: 'photo' };
    const canvas = document.createElement('canvas'), ratio = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.round(img.naturalWidth * ratio); canvas.height = Math.round(img.naturalHeight * ratio);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [.8, .6, .4, .2]) { const data = canvas.toDataURL('image/jpeg', quality).split(',')[1]; if (data.length <= 280000) return { type: 'image/jpeg', data }; }
    throw { code: 'tooLarge' };
  } finally { URL.revokeObjectURL(url); }
}
function photoControl(parent, draft) {
  const label = el('label', t('photo')), input = el('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png'; label.append(input);
  input.onchange = async () => { if (!input.files[0]) return; try { draft.answers.evidence = await compressPhoto(input.files[0]); await save(); editForm(); } catch (e) { showError(e.code ? e : { code: 'photo' }); } };
  parent.append(label, el('p', t('photoHint'), 'hint'));
  if (draft.answers.evidence) { const img = el('img'); img.src = `data:image/jpeg;base64,${draft.answers.evidence.data}`; img.alt = t('photoAttached'); img.className = 'preview'; parent.append(img, button('removePhoto', async () => { delete draft.answers.evidence; await save(); editForm(); })); }
}
function answerSummary(parent, draft, editable = false) {
  const steps = stepsFor(draft);
  steps.forEach((step, index) => {
    if (step.review) return;
    const section = el('div', undefined, 'review-line');
    for (const path of step.fields) {
      const value = at(draft.answers, path), key = path.split('.').at(-1);
      let display = moneyKeys.has(key) ? money(value) : ['help', 'source'].includes(key) ? t(`${key}.${value}`) : key === 'stage' ? t(value) : value || t('unknown');
      if (step.period !== undefined) section.append(el('p', t('period', { from: step.period * 2 + 1, to: step.period * 2 + 2 }), 'hint'));
      section.append(el('strong', fieldLabel(path, draft.kind.startsWith('report'))), el('p', display));
    }
    if (editable) section.append(button('edit', async () => { draft.step = index; await save(false); editForm(); }, 'small'));
    parent.append(section);
  });
  if (draft.answers.evidence) { const image = el('img'); image.src = `data:image/jpeg;base64,${draft.answers.evidence.data}`; image.alt = t('photoAttached'); image.className = 'preview'; parent.append(image); }
}
function reviewForm(draft, steps) {
  startView(t('review'), t('reviewHint'));
  const form = el('form'); answerSummary(form, draft, true); showChecks(form, draft.kind, draft.answers); info(form);
  form.append(el('p', t('rules')), el('p', t('penaltyRule')));
  const consent = checkbox(form, 'consentFinance'), rules = checkbox(form, 'agreeRules');
  const photo = draft.answers.evidence ? checkbox(form, 'consentPhoto') : null;
  const send = el('button', t('send'), 'primary'); send.type = 'submit';
  form.append(group(send, button('back', async () => { draft.step = steps.length - 2; await save(false); editForm(); }), button('saveLeave', async () => { state.editing = null; await save(); home(); }), button('saveOnline', async () => {
    if (!consent.checked || photo && !photo.checked) throw { code: 'consent' };
    const r = await api('draft', { draft, revision: state.account.draftRevision }); state.account.draftRevision = r.revision; await save(false); setStatus(t('savedOnline'));
  })));
  form.onsubmit = async e => { e.preventDefault(); if (!consent.checked || !rules.checked || photo && !photo.checked) return;
    try {
      draft.answers.language = getLanguage(); const answers = validateAnswers(draft.kind, draft.answers, state.config);
      state.outbox = { appId: state.id, requestId: uid(), kind: draft.kind, answers, consent: VERSION, rules: VERSION,
        ...(draft.correctionOf ? { correctionOf: draft.correctionOf, correctionReason: draft.correctionReason } : {}) };
      state.editing = null; if (!await save()) return; home(); await sendOutbox();
    } catch (err) { showError(err); }
  };
  view.append(form);
}
async function sendOutbox() {
  if (sending || !state.outbox || state.outbox.appId !== state.id) return;
  sending = true;
  try {
    const sent = await api('submit', state.outbox);
    await refresh(); // Keep the same request until the receipt is visible after a lost response.
    delete state.drafts[state.outbox.kind]; state.outbox = null;
    await save(false); setStatus(t('sent')); sentView(state.account.submissions.find(s => s.id === sent.id));
  } catch (e) { showError(e); } finally { sending = false; }
}
function sentView(sub, admin = false) {
  startView(t(sub.kind), t(`grade.${sub.status}`));
  if (sub.kind === 'report6') view.append(el('p', t(sub.recommendation), 'notice'));
  showChecks(view, sub.kind, sub.answers);
  const card = el('div', undefined, 'card');
  for (const c of sub.effective) {
    card.append(el('h2', t(`criterion.${c.id}`)), el('p', c.effectiveScore === null ? t('unknown') : t('score', { score: c.effectiveScore })), el('p', localised(c.reason)));
    if (c.penalty) card.append(el('p', t('penalty')));
    if (admin) for (const ref of c.refs) card.append(el('p', `${ref.path}: ${ref.quote}`, 'hint'));
  }
  view.append(card);
  for (const finding of sub.findings) {
    const detail = el('div', undefined, 'card'); detail.append(el('p', t(finding.action)), el('p', finding.reason));
    for (const appeal of finding.appeals) detail.append(el('p', appeal.text));
    if (!admin && finding.action === 'confirm') {
      const label = el('label', t('appeal')), input = el('textarea'); input.maxLength = 2000; label.append(input); detail.append(label, button('send', async () => { await api('appeal', { findingId: finding.id, text: input.value }); setStatus(t('appealSent')); }));
    }
    view.append(detail);
  }
  const answers = el('details'); answers.append(el('summary', t('review'))); answerSummary(answers, { kind: sub.kind, answers: sub.answers }); view.append(answers);
  if (!admin && sub.kind.startsWith('report')) view.append(button('correction', () => startDraft(sub.kind, sub)));
  if (!admin) view.append(group(button('back', home), button('retry', async () => { await refresh(); sentView(state.account.submissions.find(s => s.id === sub.id)); })));
}
function adminEntry() {
  startView(t('adminTitle'));
  const form = el('form'), label = el('label', t('adminKey')), input = el('input'); input.type = 'password'; input.required = true; input.autocomplete = 'off'; label.append(input);
  const submit = el('button', t('adminOpen'), 'primary'); submit.type = 'submit'; form.append(label, submit);
  form.onsubmit = async e => { e.preventDefault(); adminKey = input.value; try { await adminList(); } catch (err) { showError(err); } }; view.append(form);
}
async function adminList() {
  const list = await api('admin/list', undefined, adminKey); startView(t('adminList'));
  for (const app of list) { const card = el('div', undefined, 'card'); card.append(el('p', app.id), el('p', date(app.created)), button('view', () => adminApp(app.id))); view.append(card); }
  view.append(group(button('adminExport', async () => download(await api('admin/export', undefined, adminKey), 'programme')), button('signOut', () => { adminKey = ''; adminEntry(); })));
}
async function adminApp(id) {
  const app = await api(`admin/app?id=${encodeURIComponent(id)}`, undefined, adminKey);
  startView(t('adminTitle')); view.append(el('p', app.id));
  for (const sub of app.submissions) {
    const card = el('div', undefined, 'card'); card.append(el('h2', `${t(sub.kind)} · ${sub.version}`), el('p', t(`grade.${sub.status}`)));
    card.append(button('view', () => {
      sentView(sub, true);
      const result = sub.grades.filter(g => g.result).at(-1)?.result;
      for (const i of result?.integrity || []) view.append(el('p', `${i.path}: ${i.quote}`), el('p', i.reason ? localised(i.reason) : t('help.ai_answers')));
      view.append(group(button('adminIntegrity', () => adminForm(app, 'integrity', sub)), button('adminRetry', async () => { await api('admin/regrade', { appId: id, submissionId: sub.id }, adminKey); setStatus(t('adminSaved')); await adminApp(id); }), button('back', () => adminApp(id))));
    })); view.append(card);
  }
  for (const d of app.decisions) view.append(el('p', `${date(d.created)} · ${d.action} · ${d.reason}`));
  view.append(group(...(!app.grant ? [button('adminGrant', () => adminForm(app, 'grant'))] : []), button('adminDecision', () => adminForm(app, 'decision')), button('adminRecover', () => adminForm(app, 'recovery')), button('back', adminList)));
}
function adminForm(app, action, sub) {
  const titles = { grant: 'adminGrant', integrity: 'adminIntegrity', decision: 'adminDecision', recovery: 'adminRecover' };
  startView(t(titles[action]));
  const form = el('form'), values = {};
  function input(key, labelKey, type = 'text', choices) {
    const label = el('label', t(labelKey)), control = el(choices ? 'select' : type === 'textarea' ? 'textarea' : 'input');
    if (choices) choices.forEach(([value, label]) => { const option = el('option', t(label)); option.value = value; control.append(option); }); else if (type !== 'textarea') control.type = type;
    control.required = true; control.name = key; if (type === 'textarea') control.maxLength = 2000; label.append(control); form.append(label); values[key] = control;
  }
  if (action === 'grant') { form.append(el('p', t('adminGrantHint'))); input('date', 'adminDate', 'date'); }
  if (action === 'recovery') form.append(el('p', t('adminRecoveryHint')));
  if (action === 'decision') input('action', 'adminDecision', 'text', [['progress', 'progress'], ['hold', 'hold'], ['not_ready', 'not_readyDecision']]);
  if (action === 'integrity') {
    input('criterion', 'adminCriterion', 'text', CRITERIA[sub.kind].map(id => [id, `criterion.${id}`]));
    input('action', 'adminFinding', 'text', ['confirm', 'dismiss', 'reverse'].map(id => [id, id]));
    input('path', 'adminPath'); input('quote', 'adminQuote', 'textarea');
  }
  input('reason', 'adminReason', 'textarea');
  const submit = el('button', t('adminSave'), 'primary'); submit.type = 'submit'; form.append(group(submit, button('back', () => adminApp(app.id))));
  form.onsubmit = async e => { e.preventDefault();
    try {
      const body = Object.fromEntries(Object.entries(values).map(([k, input]) => [k, input.value])); body.appId = app.id;
      if (sub) { body.submissionId = sub.id; body.evidence = [{ path: body.path, quote: body.quote }]; delete body.path; delete body.quote; }
      const result = await api(`admin/${action}`, body, adminKey); setStatus(t('adminSaved'));
      if (result.token) { startView(t('keepKey'), t('adminRecoveryHint')); view.append(el('code', groupedKey(result.token)), button('back', () => adminApp(app.id))); }
      else await adminApp(app.id);
    } catch (err) { showError(err); }
  }; view.append(form);
}

try {
  loadStrings(await (await fetch('./strings.json')).json());
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      const worker = registration.installing || registration.waiting;
      if (worker && !registration.active) await new Promise(resolve => {
        worker.addEventListener('statechange', () => { if (['activated', 'redundant'].includes(worker.state)) resolve(); });
      });
    } catch {}
  }
  try { await openStorage(); } catch { setStatus(t('saveFailed'), true); }
  setLanguage(state.language || 'en');
  try { state.config = await api('config', undefined, ''); if (state.token && !reviewMode) await refresh(); else await save(false); } catch (e) { showError(e); }
  document.querySelector('#home').onclick = async e => { e.preventDefault(); state.editing = null; await save(false); render(); };
  render();
  window.addEventListener('online', () => { if (reviewMode) return; if (state.claim?.pending) claimSaved(); else if (state.outbox) sendOutbox(); });
} catch { view.textContent = document.querySelector('#startup').textContent; }
