import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync, realpathSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CALCULATION_VERSION } from '../app/js/engine.js';
import { VERSION, KINDS, CRITERIA, validateAnswers, validateDraft, financialChecks, reportPeriods, isObject, textValue, fail } from '../app/portal/model.js';
import { gradeSubmission, factsFor, RUBRIC_VERSION, RUBRIC } from './assessment.mjs';

const ROOT = fileURLToPath(new URL('../app/', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = value => Array.isArray(value) ? value.map(stable) : isObject(value) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
const encode = value => JSON.stringify(stable(value));
const json = value => JSON.parse(value);
const idKey = value => typeof value === 'string' && /^[A-Za-z0-9_-]{24,100}$/.test(value) ? value : fail('invalid', 'requestId');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
const tokenText = value => typeof value === 'string' ? value.replace(/[\s-]/g, '').toLowerCase() : '';

export function createPortal(options = {}) {
  const dbPath = options.dbPath || resolve('learner-data/portal.sqlite');
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  let secret = options.secret;
  if (!secret) {
    const keyPath = dbPath + '.key';
    if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
    secret = readFileSync(keyPath, 'utf8').trim();
  }
  if (secret.length < 32) throw new Error('Portal secret must have at least 32 characters');
  const digest = value => createHmac('sha256', secret).update(value).digest('hex');
  const claimCode = id => digest(`claim:${id}`).slice(0, 24);
  const returnToken = (id, version) => digest(`return:${id}:${version}`);
  const now = options.now || (() => new Date());
  const stamp = () => now().toISOString();
  const adminToken = options.adminToken || '';
  const ai = options.ai || {};
  const config = { testMode: true, currency: 'USD', grantAmount: 1000, retentionDays: 365, recipient: '', contact: '', aiRecipient: '', ...options.config, schemaVersion: VERSION };
  if (!/^[A-Z]{3}$/.test(config.currency) || !Number.isFinite(config.grantAmount) || config.grantAmount <= 0 || config.grantAmount > 1e12 || !Number.isInteger(config.retentionDays) || config.retentionDays < 1 || config.retentionDays > 3650) throw new Error('Invalid programme configuration');
  if (!config.testMode && (!config.recipient || !config.contact || !adminToken || !options.publicOrigin)) throw new Error('Live mode requires recipient, contact, admin token and public origin');
  if (!config.testMode && (adminToken.length < 32 || (ai.url && !config.aiRecipient))) throw new Error('Live mode requires a strong admin key and a named AI recipient when grading is enabled');
  const publicOrigin = options.publicOrigin ? new URL(options.publicOrigin).origin : null;
  if (!config.testMode && new URL(publicOrigin).protocol !== 'https:') throw new Error('Live mode requires an HTTPS origin');
  const chapters = json(readFileSync(resolve(ROOT, 'content/chapters.json'), 'utf8')).chapters;
  const scenarios = new Map(chapters.map(c => [c.id, json(readFileSync(resolve(ROOT, 'content', c.file), 'utf8'))]));
  config.chapters = chapters.map(c => ({ id: c.id, title: c.title }));
  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') chmodSync(dbPath, 0o600);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA secure_delete=ON;
    CREATE TABLE IF NOT EXISTS claims(id TEXT PRIMARY KEY, request_hash TEXT UNIQUE NOT NULL, records_hash TEXT UNIQUE NOT NULL,
      code_hash TEXT UNIQUE NOT NULL, records TEXT NOT NULL, created TEXT NOT NULL, expires TEXT NOT NULL, redeem_hash TEXT);
    CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY REFERENCES claims(id) ON DELETE CASCADE, token_hash TEXT UNIQUE NOT NULL,
      token_version INTEGER NOT NULL DEFAULT 1, created TEXT NOT NULL, config TEXT NOT NULL, draft TEXT, draft_revision INTEGER NOT NULL DEFAULT 0,
      grant TEXT);
    CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY, app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      request_id TEXT NOT NULL, kind TEXT NOT NULL, version INTEGER NOT NULL, answers TEXT NOT NULL, context TEXT NOT NULL, checks TEXT NOT NULL,
      digest TEXT NOT NULL, created TEXT NOT NULL, correction_of TEXT, correction_reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, lease TEXT, lease_until TEXT, next_at TEXT,
      UNIQUE(app_id,request_id), UNIQUE(app_id,kind,version));
    CREATE TABLE IF NOT EXISTS grades(id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      created TEXT NOT NULL, rubric TEXT NOT NULL, model TEXT NOT NULL, input_digest TEXT NOT NULL, status TEXT NOT NULL, result TEXT);
    CREATE TABLE IF NOT EXISTS integrity(id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      criterion TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL, evidence TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS appeals(id TEXT PRIMARY KEY, finding_id TEXT NOT NULL REFERENCES integrity(id) ON DELETE CASCADE,
      text TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS decisions(id TEXT PRIMARY KEY, app_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      action TEXT NOT NULL, reason TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires TEXT NOT NULL);
  `);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const transaction = fn => { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  function records(raw) {
    if (!Array.isArray(raw) || raw.length !== chapters.length) fail('finishChapters');
    const ids = new Set(); let localProfile;
    for (const r of raw) {
      const s = scenarios.get(r?.scenarioId);
      if (!s || ids.has(s.id) || r.schemaVersion !== 2 || r.scenarioVersion !== s.version || r.calculationVersion !== CALCULATION_VERSION || r.completed !== true || typeof r.attemptId !== 'string' || r.attemptId.length > 100 || !r.attemptId.length || !Array.isArray(r.observations) || r.observations.length > 2000) fail('recordUnsupported');
      if (typeof r.localProfileId !== 'string' || !r.localProfileId || (localProfile !== undefined && r.localProfileId !== localProfile)) fail('mixedProfiles');
      localProfile = r.localProfileId; ids.add(s.id);
      const decisions = r.observations.filter(o => o?.kind === 'decision' && s.turns.some(t => t.id === o.turnId));
      if (decisions.length !== s.turns.length || decisions.some((o, i) => o.turnId !== s.turns[i].id)) fail('finishChapters');
      for (let i = 0; i < decisions.length; i++) {
        const d = decisions[i], turn = s.turns[i];
        const valid = turn.decision.options?.some(o => o.id === d.optionId) || turn.decision.type === d.optionId;
        if (!valid || d.calculationVersion !== CALCULATION_VERSION || d.scenarioVersion !== s.version) fail('recordUnsupported');
        if (turn.decision.type === 'number' && (typeof d.input !== 'number' || !Number.isFinite(d.input) || d.input < turn.decision.input.min || d.input > turn.decision.input.max)) fail('recordUnsupported');
        if (turn.decision.type === 'allocate' && (!isObject(d.allocation) || Object.values(d.allocation).some(v => typeof v !== 'number' || !Number.isFinite(v) || v < 0))) fail('recordUnsupported');
        if (r.observations.filter(o => o?.kind === 'outcome' && o.turnId === d.turnId).length !== 1) fail('recordUnsupported');
      }
    }
    // Snapshots and computed profile text from a browser are not authoritative answer keys.
    return raw.map(r => ({ schemaVersion: r.schemaVersion, attemptId: r.attemptId, localProfileId: r.localProfileId,
      scenarioId: r.scenarioId, scenarioVersion: r.scenarioVersion, calculationVersion: r.calculationVersion, observations: r.observations }));
  }
  function auth(req, admin = false) {
    const token = req.headers.authorization?.replace(/^Bearer /, '') || '';
    if (admin) { if (!adminToken || !equal(token, adminToken)) fail('unauthorized'); return; }
    const app = get('SELECT * FROM applications WHERE token_hash=?', hash(tokenText(token)));
    if (!app) fail('unauthorized');
    return app;
  }
  function inputFor(sub) { return { kind: sub.kind, answers: json(sub.answers), context: json(sub.context), checks: json(sub.checks) }; }
  function viewSubmission(sub) {
    const grades = all('SELECT * FROM grades WHERE submission_id=? ORDER BY created,rowid', sub.id).map(g => ({ ...g, result: g.result ? json(g.result) : null }));
    const findings = all('SELECT * FROM integrity WHERE submission_id=? ORDER BY created,rowid', sub.id).map(i => ({ ...i, evidence: json(i.evidence), appeals: all('SELECT * FROM appeals WHERE finding_id=? ORDER BY created,rowid', i.id) }));
    const result = grades.filter(g => g.status === 'completed').at(-1)?.result;
    const effective = result?.criteria.map(c => {
      const finding = findings.filter(i => i.criterion === c.id).at(-1);
      return { ...c, effectiveScore: finding?.action === 'confirm' ? 0 : c.score, penalty: finding?.action === 'confirm' ? finding.id : null };
    }) || [];
    const ready = sub.kind === 'report6' && effective.length === CRITERIA.report6.length && sub.status === 'completed';
    const recommendation = !ready || effective.some(c => c.effectiveScore === null) ? 'needs_evidence' : effective.every(c => c.effectiveScore >= 2) ? 'ready' : 'not_ready';
    return { id: sub.id, kind: sub.kind, version: sub.version, answers: json(sub.answers), checks: json(sub.checks), context: json(sub.context),
      created: sub.created, correctionOf: sub.correction_of, correctionReason: sub.correction_reason, status: sub.status, grades, findings, effective,
      ...(sub.kind === 'report6' ? { recommendation } : {}) };
  }
  function gameFor(id) {
    const submitted = json(get('SELECT records FROM claims WHERE id=?', id).records);
    const first = submitted.find(r => r.scenarioId === chapters[0].id);
    const d = first.observations.find(o => o.kind === 'decision');
    const turn = scenarios.get(first.scenarioId).turns.find(t => t.id === d.turnId);
    return { chapter: first.scenarioId, turn: d.turnId, question: turn.situation, chosen: d.optionLabel || d.optionId, input: d.input ?? null };
  }
  function viewApp(app) {
    return { id: app.id, created: app.created, config: json(app.config), game: gameFor(app.id), draft: app.draft ? json(app.draft) : null,
      draftRevision: app.draft_revision, grant: app.grant ? json(app.grant) : null,
      periods: app.grant ? reportPeriods(json(app.grant).date) : [],
      submissions: all('SELECT * FROM submissions WHERE app_id=? ORDER BY created,rowid', app.id).map(viewSubmission),
      decisions: all('SELECT * FROM decisions WHERE app_id=? ORDER BY created,rowid', app.id) };
  }
  function rate(req) {
    const bucket = Math.floor(now().getTime() / 60000);
    // ponytail: one IP bucket; size for a shared proxy/NAT before a larger pilot.
    const key = digest(`limit:${req.socket.remoteAddress}:${bucket}`);
    run('DELETE FROM limits WHERE expires < ?', stamp());
    const row = get('SELECT count FROM limits WHERE key=?', key);
    if (row?.count >= 100) fail('rateLimited');
    run('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1', key, new Date(now().getTime() + 120000).toISOString());
  }
  async function body(req) {
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) fail('invalid');
    const chunks = []; let bytes = 0;
    for await (const chunk of req) { bytes += chunk.length; if (bytes > 2400000) fail('tooLarge'); chunks.push(chunk); }
    try { const value = json(Buffer.concat(chunks).toString()); if (!isObject(value)) fail('invalid'); return value; } catch { fail('invalid'); }
  }
  async function api(req, path, url) {
    rate(req);
    if (req.method === 'GET' && path === 'config') return config;
    if (!['GET', 'POST'].includes(req.method)) fail('notFound');
    const b = req.method === 'POST' ? await body(req) : {};
    if (req.method === 'POST' && path === 'claim') return transaction(() => {
      idKey(b.requestId);
      if (b.consent !== VERSION) fail('consent');
      const accepted = records(b.records), recordsHash = hash(encode(accepted)), requestHash = hash(b.requestId);
      const old = get('SELECT * FROM claims WHERE request_hash=?', requestHash);
      if (old) {
        if (old.records_hash !== recordsHash) fail('conflict');
        if (old.expires < stamp() && !old.redeem_hash) fail('expired');
        return { code: claimCode(old.id), expires: old.expires, redeemed: !!old.redeem_hash };
      }
      if (get('SELECT id FROM claims WHERE records_hash=?', recordsHash)) fail('alreadyClaimed');
      const id = randomUUID(), code = claimCode(id), expires = new Date(now().getTime() + 30 * 86400000).toISOString();
      run('INSERT INTO claims VALUES(?,?,?,?,?,?,?,NULL)', id, requestHash, recordsHash, hash(code), encode(accepted), stamp(), expires);
      return { code, expires, redeemed: false };
    });
    if (req.method === 'POST' && path === 'redeem') return transaction(() => {
      idKey(b.requestId);
      const claim = get('SELECT * FROM claims WHERE code_hash=?', hash(tokenText(b.code)));
      if (!claim) fail('invalidCode');
      const redeemHash = hash(b.requestId);
      if (claim.redeem_hash) {
        if (!equal(claim.redeem_hash, redeemHash)) fail('usedCode');
        const app = get('SELECT * FROM applications WHERE id=?', claim.id);
        // A recovered credential is never reissued through an old redemption request.
        if (!app || app.token_version !== 1) fail('usedCode');
        return { id: app.id, token: returnToken(app.id, 1) };
      }
      if (claim.expires < stamp()) fail('expired');
      const token = returnToken(claim.id, 1);
      run('UPDATE claims SET redeem_hash=? WHERE id=? AND redeem_hash IS NULL', redeemHash, claim.id);
      run('INSERT INTO applications(id,token_hash,created,config) VALUES(?,?,?,?)', claim.id, hash(token), stamp(), encode(config));
      return { id: claim.id, token };
    });
    if (path.startsWith('admin/')) {
      auth(req, true);
      if (req.method === 'GET' && path === 'admin/list') return all('SELECT id,created,grant FROM applications ORDER BY created DESC').map(a => ({ id: a.id, created: a.created, funded: !!a.grant }));
      if (req.method === 'GET' && path === 'admin/export') return all('SELECT * FROM applications ORDER BY created').map(viewApp);
      const appId = req.method === 'GET' ? url.searchParams.get('id') : b.appId;
      const app = get('SELECT * FROM applications WHERE id=?', typeof appId === 'string' ? appId : '');
      if (!app) fail('notFound');
      if (req.method === 'GET' && path === 'admin/app') return viewApp(app);
      if (req.method !== 'POST') fail('notFound');
      if (path === 'admin/grant') return transaction(() => {
        textValue(b.reason, 'reason', 2000, true);
        if (app.grant) fail('conflict');
        if (!get("SELECT id FROM submissions WHERE app_id=? AND kind='followup'", app.id)) fail('finishApplication');
        const periods = reportPeriods(b.date);
        if (b.date > stamp().slice(0, 10) || b.date < app.created.slice(0, 10)) fail('invalid', 'date');
        const c = json(app.config), grant = { date: b.date, amount: c.grantAmount, currency: c.currency, reason: b.reason };
        run('UPDATE applications SET grant=? WHERE id=?', encode(grant), app.id);
        run('INSERT INTO decisions VALUES(?,?,?,?,?)', randomUUID(), app.id, 'grant_recorded', b.reason, stamp());
        return { grant, periods };
      });
      if (path === 'admin/recovery') {
        textValue(b.reason, 'reason', 2000, true);
        const version = app.token_version + 1, token = returnToken(app.id, version);
        transaction(() => { run('UPDATE applications SET token_hash=?,token_version=? WHERE id=?', hash(token), version, app.id);
          run('INSERT INTO decisions VALUES(?,?,?,?,?)', randomUUID(), app.id, 'recovery', b.reason, stamp()); });
        return { token };
      }
      if (path === 'admin/decision') {
        if (!['progress', 'hold', 'not_ready'].includes(b.action)) fail('invalid');
        textValue(b.reason, 'reason', 2000, true);
        if (!get("SELECT id FROM submissions WHERE app_id=? AND kind='report6'", app.id)) fail('finishReports');
        run('INSERT INTO decisions VALUES(?,?,?,?,?)', randomUUID(), app.id, b.action, b.reason, stamp());
        return { saved: true };
      }
      const sub = get('SELECT * FROM submissions WHERE id=? AND app_id=?', b.submissionId || '', app.id);
      if (!sub) fail('notFound');
      if (path === 'admin/regrade') {
        if (sub.lease_until && sub.lease_until > stamp()) fail('busy');
        run("UPDATE submissions SET status='pending',attempts=0,lease=NULL,lease_until=NULL,next_at=NULL WHERE id=?", sub.id);
        return { saved: true };
      }
      if (path === 'admin/integrity') {
        if (!CRITERIA[sub.kind].includes(b.criterion) || !['confirm', 'dismiss', 'reverse'].includes(b.action)) fail('invalid');
        textValue(b.reason, 'reason', 2000, true);
        const facts = factsFor(inputFor(sub));
        if (!Array.isArray(b.evidence) || !b.evidence.length || b.evidence.length > 5 || b.evidence.some(e => !isObject(e) || !Object.hasOwn(facts, e.path) || typeof e.quote !== 'string' || !e.quote.trim() || !facts[e.path].includes(e.quote))) fail('invalidEvidence');
        const latest = get('SELECT action FROM integrity WHERE submission_id=? AND criterion=? ORDER BY rowid DESC LIMIT 1', sub.id, b.criterion);
        if ((b.action === 'reverse' && latest?.action !== 'confirm') || (b.action === 'confirm' && latest?.action === 'confirm')) fail('conflict');
        run('INSERT INTO integrity VALUES(?,?,?,?,?,?,?)', randomUUID(), sub.id, b.criterion, b.action, b.reason, encode(b.evidence), stamp());
        return { saved: true };
      }
      fail('notFound');
    }
    const app = auth(req);
    if (req.method === 'GET' && path === 'me') return viewApp(app);
    if (req.method === 'GET' && path === 'export') return { ...viewApp(app), records: json(get('SELECT records FROM claims WHERE id=?', app.id).records) };
    if (req.method !== 'POST') fail('notFound');
    if (path === 'delete') {
      if (b.confirm !== app.id) fail('invalid');
      run('DELETE FROM claims WHERE id=?', app.id);
      return { deleted: true };
    }
    if (path === 'draft') {
      if (!isObject(b.draft) || encode(b.draft).length > 400000 || !KINDS.includes(b.draft.kind) || !Number.isInteger(b.revision)) fail('invalid');
      const result = run('UPDATE applications SET draft=?,draft_revision=draft_revision+1 WHERE id=? AND draft_revision=?', encode(validateDraft(b.draft, json(app.config))), app.id, b.revision);
      if (!result.changes) fail('conflict');
      return { revision: b.revision + 1 };
    }
    if (path === 'appeal') {
      const finding = get('SELECT i.id FROM integrity i JOIN submissions s ON i.submission_id=s.id WHERE i.id=? AND s.app_id=?', b.findingId || '', app.id);
      if (!finding) fail('notFound');
      const value = textValue(b.text, 'text', 2000, true);
      if (!get('SELECT id FROM appeals WHERE finding_id=? AND text=?', finding.id, value)) run('INSERT INTO appeals VALUES(?,?,?,?)', randomUUID(), finding.id, value, stamp());
      return { saved: true };
    }
    if (path === 'submit') return transaction(() => {
      idKey(b.requestId);
      if (b.consent !== VERSION || b.rules !== VERSION) fail('consent');
      const c = json(app.config), answers = validateAnswers(b.kind, b.answers, c), digestValue = hash(encode({ kind: b.kind, answers, correctionOf: b.correctionOf || null, correctionReason: b.correctionReason || '' }));
      if (answers.evidence) { const bytes = Buffer.from(answers.evidence.data, 'base64'); if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) fail('invalid', 'evidence'); }
      const old = get('SELECT * FROM submissions WHERE app_id=? AND request_id=?', app.id, b.requestId);
      if (old) { if (old.digest !== digestValue) fail('conflict'); return { id: old.id, submitted: true, status: old.status }; }
      const latest = get('SELECT * FROM submissions WHERE app_id=? AND kind=? ORDER BY version DESC LIMIT 1', app.id, b.kind);
      if (latest && (!b.kind.startsWith('report') || b.correctionOf !== latest.id || !textValue(b.correctionReason, 'correctionReason', 1000, true))) fail('alreadySubmitted');
      if (!latest && b.correctionOf) fail('conflict');
      if (get('SELECT count(*) AS count FROM submissions WHERE app_id=?', app.id).count >= 50) fail('rateLimited');
      const initial = get("SELECT * FROM submissions WHERE app_id=? AND kind='application'", app.id);
      if (b.kind !== 'application' && !initial) fail('finishApplication');
      if (b.kind.startsWith('report')) {
        if (!app.grant) fail('notFunded');
        const previous = Number(b.kind.slice(6)) - 2;
        if (previous && !get('SELECT id FROM submissions WHERE app_id=? AND kind=?', app.id, `report${previous}`)) fail('finishReports');
        const period = reportPeriods(json(app.grant).date).find(p => p.kind === b.kind);
        if (stamp().slice(0, 10) < period.due) fail('notDue');
      }
      const checks = financialChecks(b.kind, answers, c);
      let context = {};
      if (b.kind !== 'application') {
        const original = json(initial.answers); delete original.contact; delete original.evidence;
        context.original = original;
      }
      if (b.kind === 'followup') {
        context.game = gameFor(app.id);
      }
      if (b.kind.startsWith('report')) {
        context.grant = json(app.grant); delete context.grant.reason;
        context.period = reportPeriods(context.grant.date).find(p => p.kind === b.kind);
        context.previousReports = all("SELECT * FROM submissions WHERE app_id=? AND kind LIKE 'report%' ORDER BY created,rowid", app.id)
          .filter(s => s.kind < b.kind).filter((s, _, list) => !list.some(other => other.kind === s.kind && other.version > s.version))
          .map(s => { const a = json(s.answers); delete a.evidence; return { kind: s.kind, version: s.version, answers: a }; });
      }
      const id = randomUUID();
      run('INSERT INTO submissions(id,app_id,request_id,kind,version,answers,context,checks,digest,created,correction_of,correction_reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
        id, app.id, b.requestId, b.kind, (latest?.version || 0) + 1, encode(answers), encode(context), encode(checks), digestValue, stamp(), latest?.id || null, b.correctionReason || '');
      run('UPDATE applications SET draft=NULL,draft_revision=draft_revision+1 WHERE id=?', app.id);
      return { id, submitted: true, status: 'pending' };
    });
    fail('notFound');
  }
  let processing = null, timer;
  async function processNext() {
    if (processing || !ai.url || !ai.model) return false;
    run("UPDATE submissions SET status='unavailable',lease=NULL,lease_until=NULL WHERE status='grading' AND attempts>=3 AND lease_until<?", stamp());
    const sub = transaction(() => {
      const s = get("SELECT * FROM submissions WHERE status IN ('pending','grading') AND attempts<3 AND (lease_until IS NULL OR lease_until<?) AND (next_at IS NULL OR next_at<=?) ORDER BY created,rowid LIMIT 1", stamp(), stamp());
      if (!s) return null;
      s.lease = randomUUID();
      run("UPDATE submissions SET status='grading',lease=?,lease_until=?,attempts=attempts+1 WHERE id=?", s.lease, new Date(now().getTime() + 90000).toISOString(), s.id);
      return s;
    });
    if (!sub) return false;
    processing = (async () => {
      let result = null, status = 'completed';
      const input = inputFor(sub);
      try {
        const applicationConfig = json(get('SELECT config FROM applications WHERE id=?', sub.app_id).config);
        if (applicationConfig.aiRecipient !== config.aiRecipient) fail('recipientChanged');
        result = await gradeSubmission(input, ai);
      } catch { status = 'unavailable'; }
      transaction(() => {
        const current = get('SELECT * FROM submissions WHERE id=? AND lease=?', sub.id, sub.lease);
        if (!current) return;
        run('INSERT INTO grades VALUES(?,?,?,?,?,?,?,?)', randomUUID(), sub.id, stamp(), RUBRIC, ai.model, hash(encode({ input, rubricVersion: RUBRIC_VERSION })), status, result ? encode(result) : null);
        run('UPDATE submissions SET status=?,lease=NULL,lease_until=NULL,next_at=? WHERE id=? AND lease=?', status === 'completed' ? 'completed' : current.attempts >= 3 ? 'unavailable' : 'pending',
          status === 'completed' ? null : new Date(now().getTime() + 30000 * current.attempts).toISOString(), sub.id, sub.lease);
      });
    })();
    try { await processing; } finally { processing = null; }
    return true;
  }
  function expire() {
    run("DELETE FROM claims WHERE id IN (SELECT id FROM applications WHERE datetime(created, '+' || json_extract(config,'$.retentionDays') || ' days') < datetime(?)) OR (redeem_hash IS NULL AND expires<?)", stamp(), stamp());
  }
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
    try {
      const host = req.headers.host || '';
      const url = new URL(req.url, 'http://' + host);
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && (!publicOrigin || new URL(publicOrigin).host !== host)) fail('forbidden');
      if (url.pathname.startsWith('/api/portal/')) {
        res.setHeader('Cache-Control', 'no-store');
        if (req.headers.origin && req.headers.origin !== publicOrigin && req.headers.origin !== `http://${host}`) fail('forbidden');
        const data = await api(req, url.pathname.slice('/api/portal/'.length), url);
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(data)); return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') fail('notFound');
      const pathname = decodeURIComponent(url.pathname);
      const file = resolve(ROOT, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
      if (!file.startsWith(ROOT) || !types[extname(file)] || !existsSync(file) || !realpathSync(file).startsWith(ROOT)) fail('notFound');
      if (pathname.startsWith('/portal/')) res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
      res.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
    } catch (e) {
      const code = e.code && /^[a-z][A-Za-z]+$/.test(e.code) ? e.code : 'serverError';
      const status = code === 'unauthorized' ? 401 : ['forbidden', 'consent'].includes(code) ? 403 : code === 'notFound' ? 404 : code === 'rateLimited' ? 429 : code === 'tooLarge' ? 413 : ['conflict', 'alreadySubmitted', 'usedCode', 'alreadyClaimed', 'busy'].includes(code) ? 409 : code === 'serverError' ? 500 : 400;
      if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: code, field: e.field || '' }));
    }
  });
  server.requestTimeout = 20000; server.headersTimeout = 10000;
  return { server, db, config, processNext, expire,
    startJobs() { timer = setInterval(() => { try { expire(); processNext().catch(() => {}); } catch {} }, 2000); timer.unref(); },
    async close() { clearInterval(timer); if (processing) await processing; await new Promise(r => server.close(r)); db.close(); },
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const portal = createPortal({ dbPath: process.env.PORTAL_DB, adminToken: process.env.PORTAL_ADMIN_TOKEN,
    publicOrigin: process.env.PORTAL_ORIGIN, config: { testMode: process.env.PORTAL_LIVE !== '1',
      currency: process.env.PORTAL_CURRENCY || 'USD', grantAmount: Number(process.env.PORTAL_GRANT_AMOUNT || 1000),
      retentionDays: Number(process.env.PORTAL_RETENTION_DAYS || 365), recipient: process.env.PORTAL_RECIPIENT || '', contact: process.env.PORTAL_CONTACT || '', aiRecipient: process.env.PORTAL_AI_RECIPIENT || '' },
    ai: { url: process.env.PORTAL_AI_URL, model: process.env.PORTAL_AI_MODEL, key: process.env.PORTAL_AI_KEY } });
  const port = Number(process.env.PORTAL_PORT || 8787), host = process.env.PORTAL_HOST || '127.0.0.1';
  portal.server.listen(port, host, () => { console.log(`Portal: http://${host}:${port}/portal/`); portal.startJobs(); });
  process.on('SIGTERM', () => portal.close()); process.on('SIGINT', () => portal.close());
}
