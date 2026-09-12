// Shared portal contract. Amounts are in the configured currency, never in game scores.
export const VERSION = 1;
export const KINDS = ['application', 'followup', 'report2', 'report4', 'report6'];
export const CRITERIA = {
  application: ['forecast', 'bottleneck', 'response', 'records'],
  followup: ['basis', 'adjustment', 'transfer'],
  report2: ['records', 'execution', 'understanding', 'adaptation'],
  report4: ['records', 'execution', 'understanding', 'adaptation'],
  report6: ['records', 'execution', 'understanding', 'adaptation', 'readiness'],
};
export const MONEY = ['customers', 'added', 'costs', 'drawings'];
const APP_TEXT = ['business', 'customer', 'action', 'success', 'basis', 'spendItem', 'grantReason', 'risk', 'response', 'records', 'contact'];
const REPORT_TEXT = ['wentWell', 'wentWrong', 'why', 'changed', 'result', 'nextAction', 'evidenceNote'];
export const OPTIONAL_MONEY = ['owedByCustomers', 'owedToSuppliers', 'stock', 'equipment', 'debt'];
export const HELP = ['none', 'language', 'typing', 'person', 'ai_answers'];
export const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export function fail(code, field = '') { throw Object.assign(new Error(code), { code, field }); }
export function textValue(value, field, max = 2000, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('invalid', field);
  return value.trim();
}
export function amount(value, field) {
  if (value === null) return null; // Unknown is not zero.
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12 || Math.abs(value * 100 - Math.round(value * 100)) > 0.01) fail('invalid', field);
  return value;
}
export function cashTotal(opening, flow) {
  const values = [opening, ...MONEY.map(k => flow[k])];
  if (values.some(v => typeof v !== 'number' || !Number.isFinite(v))) return null;
  return (Math.round(opening * 100) + Math.round(flow.customers * 100) + Math.round(flow.added * 100) - Math.round(flow.costs * 100) - Math.round(flow.drawings * 100)) / 100;
}
export function financialChecks(kind, a, config) {
  if (kind === 'followup') return [];
  const checks = [];
  if (kind === 'application') {
    let opening = a.openingCash;
    a.periods.forEach((p, i) => {
      const closing = cashTotal(opening, p);
      checks.push({ code: closing === null ? 'unknownCash' : closing < 0 ? 'cashGap' : 'cashExpected', period: i + 1, value: closing });
      opening = closing;
    });
    checks.push({ code: 'reserve', value: (Math.round(config.grantAmount * 100) - Math.round(a.spendAmount * 100)) / 100 });
  } else {
    const expected = cashTotal(a.openingCash, a);
    checks.push({ code: expected === null ? 'unknownCash' : 'cashExpected', value: expected });
    checks.push({ code: expected === null || a.closingCash === null ? 'unknownBalance' : Math.abs(expected - a.closingCash) < 0.005 ? 'balanced' : 'cashDifference', value: expected === null || a.closingCash === null ? null : Math.round((a.closingCash - expected) * 100) / 100 });
  }
  return checks;
}
export function validateAnswers(kind, raw, config, draft = false) {
  if (!KINDS.includes(kind) || !isObject(raw)) fail('invalid');
  const a = {};
  const fields = kind === 'application' ? APP_TEXT : kind === 'followup' ? ['basisAnswer', 'changeAnswer', 'gameAnswer'] : [...REPORT_TEXT, ...(kind === 'report6' ? ['learned', 'bottleneck', 'nextGrantUse'] : [])];
  for (const field of fields) a[field] = textValue(raw[field], field, field === 'contact' ? 160 : 2000, !draft && kind === 'application' && ['business', 'customer', 'action'].includes(field));
  if (!HELP.includes(raw.help)) fail('invalid', 'help');
  a.help = raw.help;
  if (!['en', 'sw'].includes(raw.language)) fail('invalid', 'language');
  a.language = raw.language;
  if (kind !== 'followup') {
    a.openingCash = amount(raw.openingCash, 'openingCash');
    for (const key of OPTIONAL_MONEY) if (Object.hasOwn(raw, key)) a[key] = amount(raw[key], key);
    if (kind === 'application') {
      if (!['trading', 'testing'].includes(raw.stage)) fail('invalid', 'stage');
      a.stage = raw.stage;
      a.spendAmount = amount(raw.spendAmount, 'spendAmount');
      if (a.spendAmount === null || a.spendAmount > config.grantAmount) fail('invalid', 'spendAmount');
      if (!Array.isArray(raw.periods) || raw.periods.length !== 3) fail('invalid', 'periods');
      a.periods = raw.periods.map((p, i) => {
        if (!isObject(p)) fail('invalid', 'periods');
        return Object.fromEntries(MONEY.map(k => [k, amount(p[k], `periods.${i}.${k}`)]));
      });
    } else {
      for (const k of [...MONEY, 'closingCash', 'nextCustomers', 'nextCosts']) a[k] = amount(raw[k], k);
      if (!['records', 'estimate', 'mixed'].includes(raw.source)) fail('invalid', 'source');
      a.source = raw.source;
    }
  }
  if (raw.evidence !== undefined && raw.evidence !== null) {
    const e = raw.evidence;
    if (!isObject(e) || e.type !== 'image/jpeg' || typeof e.data !== 'string' || e.data.length > 280000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(e.data)) fail('invalid', 'evidence');
    a.evidence = { type: e.type, data: e.data };
  }
  return a;
}
export function addMonths(iso, months) {
  const date = new Date(iso + 'T00:00:00Z');
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) fail('invalid', 'date');
  const day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString().slice(0, 10);
}
export function reportPeriods(start) {
  return [2, 4, 6].map(month => ({ kind: `report${month}`, month, from: addMonths(start, month - 2), due: addMonths(start, month) }));
}
export function blankAnswers(kind, config, language = 'en') {
  const fields = kind === 'application' ? APP_TEXT : kind === 'followup' ? ['basisAnswer', 'changeAnswer', 'gameAnswer'] : [...REPORT_TEXT, 'learned', 'bottleneck', 'nextGrantUse'];
  const a = Object.fromEntries(fields.map(k => [k, '']));
  Object.assign(a, { help: 'none', language, stage: 'testing', source: 'estimate', openingCash: null });
  if (kind === 'application') {
    a.periods = [0, 1, 2].map(() => ({ customers: null, added: 0, costs: null, drawings: 0 }));
    a.spendAmount = config.grantAmount;
  } else for (const k of [...MONEY, 'closingCash', 'nextCustomers', 'nextCosts']) a[k] = null;
  return a;
}

export function validateDraft(raw, config) {
  if (!isObject(raw) || !KINDS.includes(raw.kind) || !Number.isInteger(raw.step) || raw.step < 0 || raw.step > 20) fail('invalid');
  return { kind: raw.kind, step: raw.step, answers: validateAnswers(raw.kind, raw.answers, config, true),
    ...(raw.correctionOf ? { correctionOf: textValue(raw.correctionOf, 'correctionOf', 100, true), correctionReason: textValue(raw.correctionReason, 'correctionReason', 1000) } : {}) };
}
