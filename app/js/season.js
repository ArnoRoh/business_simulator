// One continuous business season (MV-BS-DES-002). Pure, deterministic, integer money.
// Nothing here touches the DOM, storage or the clock, so Node tests run it directly.
//
//   createSeason({ seed }) -> state          week 1, ready plan, nothing to set up
//   step(state, action) -> { state, result }  the only transition; throws Error(code) if not allowed
//   replay(seed, actions) -> state            re-applies a recorded action list
//   can(state, action) -> boolean
//   quiet(state) -> boolean                   next week is routine: no event, close or shortage
//   needs(state, pieces) -> order card        cooking, cash and hours an order needs, from this state
//   capacity(state) -> trays per day and what limits them
//   limit(result) -> the stage that limited a finished week, or ''
//   balance(state) -> accounting identity (assets - liabilities === opening + profit - drawings)
//   facts(state) -> season facts; never a score or a rank
//
// Actions: { type: 'plan', patch: { trays, price, pay, buyWeeks, household, check } }
//   { type: 'run' } { type: 'answer', option } { type: 'buyPot' } { type: 'sellPot' }
//   { type: 'trainHelper' } { type: 'endHelper' }
//   { type: 'borrow' } { type: 'repay' } { type: 'chase', who } { type: 'credit', who, on }
//   { type: 'notebook', on } { type: 'help' } { type: 'goal', goal } { type: 'review' } { type: 'close' }
// Phases: 'plan' (board), 'event' (state.pending names it), 'review' (month close), 'closed'.
//
// Accounting rules: cash and credit sales are revenue when delivered; collection moves a
// receivable into cash and is never new profit. Packs are stock (an asset, first in first
// out) until cooked. Borrowing adds equal cash and debt; interest is a cost, principal is
// not. Household money and dated household payments are drawings, not costs. Equipment
// is an asset depreciated weekly. Nothing is bought with cash the tin does not hold; an
// unpaid wage, fee or instalment becomes a dated debt instead.
//
// All figures are SAMPLES for review, not verified local prices (AGENTS.md section 6).
export const CALC_VERSION = 1;
export const WEEKS = 24;
export const SAMPLE = {
  cash: 15000, household: 1500, pack: 300, bulkOff: 15, rise: 75, pieces: 10, smallPieces: 12,
  price: { low: 40, normal: 50, high: 60 }, demand: { low: 125, normal: 100, high: 75 }, stallDemand: 55,
  fee: 1200, days: 6, ownerHours: 72, stallHours: 30, trayHours: 3, notebookHours: 2,
  checkHours: { none: 0, batch: 2, every: 6 }, rejects: { none: 10, batch: 2, every: 0 },
  pot: { cost: 6000, trays: 5, dep: 250, resale: 3000, max: 3 }, flask: { cost: 5000, dep: 200 },
  office: { hours: 6, trialCost: 1000, chai: 60, chaiCost: 25, pieces: 2, invited: 20 },
  school: { full: 60, small: 30, price: 45, better: 50, term: 4, hours: 12, inspection: 3000, pay: 85 },
  kiosk: { pieces: 30, price: 42, hours: 3, pay: 90 },
  neighbours: { neema: 85, baraka: 55, zawadi: 75 }, neighbourPieces: 5,
  supplier: { limit: 6000, term: 2 }, wage: 3000, helperHours: 48, training: 1000, helperTrial: 500,
  loan: { amount: 10000, principal: 1000, interest: 100 }, payments: [[8, 9000], [20, 9000]], lateFee: 500,
  awayWeek: 17, riseWeek: 18,
};
const P = SAMPLE;
const STEPS = ['low', 'normal', 'high'];
const PLAN_LIMITS = { trays: [0, 15], household: [0, 10000] };

// Seeded stream per (seed, keys): call order elsewhere cannot change an outcome.
function rng(seed, ...keys) {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (const c of keys.join('|')) h = Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = Math.imul(h ^ (h >>> 15), h | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pct = (n, p) => Math.floor(n * p / 100);
const sum = list => list.reduce((a, b) => a + b, 0);
const fail = code => { throw new Error(code); };

export function createSeason({ seed = 1 } = {}) {
  seed = seed >>> 0;
  const r = rng(seed, 'setup');
  const s = {
    calc: CALC_VERSION, seed, week: 1, phase: 'plan', pending: null, done: {},
    plan: { trays: 4, price: 'normal', pay: 'cash', buyWeeks: 1, household: P.household, check: 'none' },
    cash: P.cash, packs: [], pots: 1, flask: false, equipment: [], payables: [], receivables: [],
    customers: {}, office: null, trial: null, school: null, kiosk: null, loan: null, helper: null,
    notebook: false, notebookFrom: 0, blocked: false, small: false, competitor: false, investigated: '',
    payments: P.payments.map(([week, amount]) => ({ week, due: week, amount, status: 'due' })),
    goal: '', goals: [], help: [], threads: [], history: [],
    // Hidden, bounded interest: the paid trial shows it once; later weeks vary around it.
    officeBase: between(r, 4, 9), rainWeek: between(r, 19, 23), helperSkill: between(r, 55, 80),
    flow: {}, pnl: {}, hours: 0, chased: [],
    totals: { revenue: 0, profit: 0, drawings: 0 }, opening: P.cash,
    household: { paid: 0, short: 0, streak: 0 }, away: '', seq: 0,
  };
  return s;
}

const packCost = s => (s.week >= P.riseWeek ? P.pack + P.rise : P.pack) - (s.plan.buyWeeks === 2 ? P.bulkOff : 0);
export const stock = s => sum(s.packs.map(l => l.qty));
const stockValue = s => sum(s.packs.map(l => l.qty * l.cost));
const owedToYou = s => sum(s.receivables.map(x => x.amount));
const owedByYou = s => sum(s.payables.map(x => x.amount)) + (s.loan?.balance || 0);
const book = s => sum(s.equipment.map(e => e.book));
const add = (bag, key, n) => { if (n) bag[key] = (bag[key] || 0) + n; };
const price = s => P.price[s.plan.price];
const thread = (s, key, params = {}) => s.threads.push({ week: s.week, key, ...params });
const schoolPrice = s => s.school?.better ? P.school.better : P.school.price;
const effort = h => h ? (h.trained ? Math.min(95, h.skill + 25) : h.skill) : 0;

export function balance(s) {
  const assets = s.cash + stockValue(s) + owedToYou(s) + book(s);
  const liabilities = owedByYou(s);
  return { assets, liabilities, equity: assets - liabilities, expected: s.opening + s.totals.profit - s.totals.drawings };
}

function awayMode(s) {
  if (s.week !== P.awayWeek) return '';
  const choice = s.done.away2 || s.done.away;
  return choice === 'cover' && s.helper ? 'cover' : choice === 'close' ? 'close' : 'uncovered';
}

export function capacity(s) {
  const away = awayMode(s);
  let fixed = away ? 0 : P.stallHours + (s.office ? P.office.hours : 0) + (s.school ? P.school.hours : 0) +
    (s.kiosk ? P.kiosk.hours : 0) + (s.notebook ? P.notebookHours : 0) + (s.helper ? P.checkHours[s.plan.check] : 0) + s.hours;
  if (s.trial?.week === s.week) fixed += P.office.hours;
  const owner = away ? 0 : Math.max(0, Math.floor((P.ownerHours - fixed) / P.trayHours));
  let helper = s.helper && !s.helper.training ? Math.floor(P.helperHours / P.trayHours * effort(s.helper) / 100) : 0;
  if (away === 'cover') helper = Math.floor(helper / 2); // Juma also serves the stall.
  const pots = s.pots * P.pot.trays;
  const trays = Math.min(pots, owner + helper);
  return { trays, pots, owner, helper, fixed: away ? 0 : fixed, by: trays === pots && owner + helper > pots ? 'pots' : 'hours' };
}
// Owner hours a week for a batch: fixed work plus the trays the helper does not cook.
export const hours = (cap, trays) => cap.fixed + Math.max(0, Math.min(trays, cap.owner + cap.helper) - cap.helper) * P.trayHours;

// Pieces per day that committed customers take before walk-in customers.
function orders(s) {
  return (s.school ? s.school.pieces : 0) + (s.trial?.school === s.week ? P.school.small : 0) +
    (s.kiosk ? P.kiosk.pieces : 0) + (s.office || s.trial?.week === s.week ? (s.history.findLast(r => r.trial)?.trial.paid ?? (s.office ? Math.round(sum((s.history.at(-1)?.days || []).map(d => d.buyers || 0)) / P.days) : 0)) * P.office.pieces : 0) +
    Object.values(s.customers).filter(c => c.credit).length * P.neighbourPieces;
}

export const committed = s => Math.ceil(orders(s) / pieces_(s));
export function needs(s, pieces) {
  const extra = Math.ceil(pieces / pieces_(s));
  const trays = s.plan.trays + extra;
  const cap = capacity({ ...s, school: { pieces } });
  const short = Math.max(0, trays - cap.trays);
  const weekInputs = extra * P.days * packCost(s);
  return { trays, capacity: cap.trays, short, by: cap.by, weekInputs, term: P.school.term,
    cash: (weekInputs + (short && !s.helper ? P.wage : 0)) * P.school.term,
    inspection: P.school.inspection, hours: P.school.hours, available: s.cash };
}
const pieces_ = s => s.small ? P.smallPieces : P.pieces;

// ---- events -----------------------------------------------------------------

const payment = s => s.payments.find(p => p.status === 'due' && p.due === s.week);
const EVENTS = [
  ['payment', s => payment(s)],
  ['pot', s => s.week === 2 && s.pots < 2],
  ['neema', s => s.week === 2],
  ['notebook', s => s.week === 3 && !s.notebook],
  ['office', s => s.week === 4 && !s.office],
  ['office2', s => s.week === 6 && s.done.office === 'later' && !s.office],
  ['officeResult', s => s.trial && s.trial.week === s.week - 1 && !s.office],
  ['neighbours', s => s.week === 6 && s.customers.neema?.credit],
  ['school', s => s.week === 10 && s.office],
  ['competitor', s => s.week === 10 && !s.office],
  ['schoolTrial', s => s.week === 11 && s.done.school === 'trial'],
  ['schoolCounter', s => s.counter === s.week],
  ['kiosk', s => s.week === 12],
  ['helper', s => s.week === 13 && !s.helper],
  ['helperHire', s => s.week === 14 && s.done.helper === 'trial'],
  ['discrepancy', s => s.week === 15 && s.helper && (s.history.at(-1)?.rejected || 0) > 0],
  ['away', s => s.week === 15],
  ['away2', s => s.week === 16 && s.done.away === 'later'],
  ['flour', s => s.week === P.riseWeek],
];
const OPTIONS = {
  payment: ['pay', 'borrow', 'defer', 'short'], pot: ['buy', 'later'], neema: ['yes', 'no'],
  notebook: ['start', 'later'], office: ['flask', 'trial', 'later'], office2: ['flask', 'trial', 'no'],
  officeResult: ['flask', 'no'], neighbours: ['yes', 'no'], school: ['full', 'small', 'trial', 'decline'],
  competitor: ['lower', 'hold'], schoolTrial: ['full', 'small', 'decline'], schoolCounter: ['full', 'decline'],
  kiosk: ['yes', 'no'], helper: ['trial', 'hire', 'train', 'later'], helperHire: ['hire', 'train', 'no'],
  discrepancy: ['records', 'count', 'leave'], away: ['cover', 'close', 'later'], away2: ['cover', 'close', 'nothing'],
  flour: ['price', 'smaller', 'renegotiate', 'keep'],
};
export const eventOptions = id => OPTIONS[id] || [];

function arrive(s) {
  s.phase = 'plan'; s.pending = null;
  const ev = EVENTS.find(([id, when]) => !s.done[`${id}@${s.week}`] && when(s));
  if (ev) { s.phase = 'event'; s.pending = ev[0]; }
}

function spend(s, amount, flowKey) {
  if (amount > s.cash) fail('cash');
  s.cash -= amount; add(s.flow, flowKey, -amount);
}
function cost(s, amount, line, flowKey = 'costs') { spend(s, amount, flowKey); add(s.pnl, line, amount); s.totals.profit -= amount; }
function draw(s, amount) { spend(s, amount, 'household'); s.totals.drawings += amount; }
function buyEquipment(s, kind) {
  const item = P[kind]; spend(s, item.cost, 'equipment');
  s.equipment.push({ kind, cost: item.cost, book: item.cost, dep: item.dep, week: s.week });
  if (kind === 'pot') s.pots++; else s.flask = true;
}
const canBorrow = s => !s.loan && !s.payables.some(x => x.who === 'lender');
function borrow(s) {
  if (!canBorrow(s)) fail('loan');
  s.loan = { balance: P.loan.amount, from: s.week };
  s.cash += P.loan.amount; add(s.flow, 'borrowed', P.loan.amount);
  thread(s, 'borrowed', { amount: P.loan.amount });
}
function startOffice(s) { buyEquipment(s, 'flask'); s.office = { from: s.week }; }

function answer(s, option) {
  const id = s.pending;
  if (s.phase !== 'event' || !OPTIONS[id].includes(option)) fail('option');
  const due = payment(s);
  const allowed = {
    payment: { pay: s.cash >= due?.amount, borrow: canBorrow(s), defer: !due?.deferred, short: s.cash < due?.amount },
    pot: { buy: s.cash >= P.pot.cost && s.pots < P.pot.max }, office: { flask: s.cash >= P.flask.cost, trial: s.cash >= P.office.trialCost },
    office2: { flask: s.cash >= P.flask.cost, trial: s.cash >= P.office.trialCost }, officeResult: { flask: s.cash >= P.flask.cost },
    school: { full: s.cash >= P.school.inspection, small: s.cash >= P.school.inspection },
    schoolTrial: { full: s.cash >= P.school.inspection, small: s.cash >= P.school.inspection },
    schoolCounter: { full: s.cash >= P.school.inspection },
    helper: { trial: s.cash >= P.helperTrial, train: s.cash >= P.training }, helperHire: { train: s.cash >= P.training },
    away: { cover: !!s.helper }, away2: { cover: !!s.helper }, flour: { renegotiate: !!s.school, price: s.plan.price !== 'high' },
  }[id]?.[option];
  if (allowed === false) fail('option');
  const r = rng(s.seed, 'answer', id, s.week);
  const out = { event: id, option };
  switch (id) {
    case 'payment':
      if (option === 'borrow') borrow(s);
      if (option === 'pay' || option === 'borrow') {
        draw(s, due.amount); due.status = 'paid'; due.paid = s.week;
        thread(s, due.due === due.week ? 'paymentPaid' : 'paymentLate', { amount: due.amount, from: due.week });
      } else if (option === 'defer') {
        draw(s, P.lateFee); due.deferred = true; due.due = s.week + 2; out.due = due.due;
      } else {
        const part = s.cash; draw(s, part); due.status = 'missed'; due.paidPart = part; out.part = part;
        thread(s, 'paymentMissed', { amount: due.amount - part, from: due.week });
      }
      break;
    case 'pot': if (option === 'buy') buyEquipment(s, 'pot'); break;
    case 'neema': if (option === 'yes') s.customers.neema = { credit: true, from: s.week }; break;
    case 'notebook': if (option === 'start') { s.notebook = true; s.notebookFrom = s.week; } break;
    case 'office': case 'office2': case 'officeResult':
      if (option === 'flask') startOffice(s);
      if (option === 'trial') { cost(s, P.office.trialCost, 'other'); s.trial = { week: s.week }; }
      break;
    case 'neighbours':
      if (option === 'yes') for (const who of ['baraka', 'zawadi']) s.customers[who] = { credit: true, from: s.week };
      break;
    case 'school': case 'schoolTrial': case 'schoolCounter':
      if (option === 'trial') { s.trial = { ...s.trial, school: s.week }; break; }
      if (option === 'decline') break;
      if (option === 'small' && r() * 100 >= 70) { s.counter = s.week; out.refused = true; break; }
      cost(s, P.school.inspection, 'other');
      s.school = { pieces: option === 'full' ? P.school.full : P.school.small, from: s.week, strikes: 0, late: 0 };
      thread(s, 'schoolStart', { pieces: s.school.pieces });
      break;
    case 'competitor': s.competitor = true; if (option === 'lower') s.plan.price = 'low'; break;
    case 'kiosk': if (option === 'yes') s.kiosk = { from: s.week, late: 0 }; break;
    case 'helper': case 'helperHire':
      if (option === 'trial') { cost(s, P.helperTrial, 'other'); out.skill = s.helperSkill; s.helperKnown = true; }
      if (option === 'hire' || option === 'train') {
        s.helper = { skill: s.helperSkill, trained: option === 'train', training: option === 'train', from: s.week, known: !!s.helperKnown };
        if (option === 'train') cost(s, P.training, 'other');
      }
      break;
    case 'discrepancy': {
      const last = s.history.at(-1);
      if (option === 'records' && last.noted) { s.investigated = 'found'; out.found = last.rejected; out.sent = sum(last.days.map(d => d.school)); }
      else if (option === 'records') { s.hours += 3; s.investigated = 'unclear'; }
      if (option === 'count') s.plan.check = 'batch';
      break;
    }
    case 'away': case 'away2': s.away = option; break;
    case 'flour':
      if (option === 'price') s.plan.price = STEPS[STEPS.indexOf(s.plan.price) + 1];
      if (option === 'smaller') s.small = true;
      if (option === 'renegotiate') { out.accepted = r() * 100 < 60; if (out.accepted) s.school.better = true; }
      break;
  }
  s.done[`${id}@${s.week}`] = option; s.done[id] = option;
  arrive(s);
  return out;
}

// ---- trading week -------------------------------------------------------------

function settleReceivables(s, res) {
  for (const x of [...s.receivables]) {
    if (x.due > s.week) continue;
    const chance = (x.who === 'school' ? P.school.pay : x.who === 'kiosk' ? P.kiosk.pay : P.neighbours[x.who]) + 10 * x.late;
    if (rng(s.seed, 'collect', x.id, s.week)() * 100 < chance) collect(s, x, res);
    else { x.late++; x.due = s.week + 1; res.late.push(x.who); }
  }
}
function collect(s, x, res) {
  s.receivables = s.receivables.filter(y => y !== x);
  s.cash += x.amount; add(s.flow, 'collected', x.amount);
  res && res.collected.push({ who: x.who, amount: x.amount, from: x.week });
  thread(s, 'collected', { who: x.who, amount: x.amount, from: x.week });
}

function payDue(s, res) {
  for (const x of [...s.payables].sort((a, b) => a.due - b.due)) {
    if (x.due > s.week) continue;
    if (s.cash >= x.amount) {
      s.cash -= x.amount; add(s.flow, x.who === 'bakari' ? 'supplier' : 'arrears', -x.amount);
      s.payables = s.payables.filter(y => y !== x);
      if (x.who === 'bakari' && s.blocked && !s.payables.some(y => y.who === 'bakari' && y.due < s.week)) s.blocked = false;
    } else if (x.who === 'bakari' && !s.blocked) {
      s.blocked = true; res.notes.push('blocked'); thread(s, 'supplierBlocked', { amount: x.amount, from: x.week });
    }
  }
}

// Pay a weekly cost; what the tin cannot pay becomes a debt due next week.
function obligation(s, amount, line, who) {
  if (!amount) return;
  const paid = Math.min(amount, s.cash);
  s.cash -= paid; add(s.flow, 'costs', -paid);
  if (line) { add(s.pnl, line, amount); s.totals.profit -= amount; }
  if (amount > paid) s.payables.push({ id: ++s.seq, who, amount: amount - paid, due: s.week + 1, week: s.week });
}

function buy(s, trays, res) {
  const unit = packCost(s);
  const want = Math.max(0, trays * P.days * s.plan.buyWeeks - stock(s));
  let credit = 0;
  if (s.plan.pay === 'credit' && !s.blocked) {
    const room = P.supplier.limit - sum(s.payables.filter(x => x.who === 'bakari').map(x => x.amount));
    credit = Math.min(want, Math.max(0, Math.floor(room / unit)));
  }
  const cash = Math.min(want - credit, Math.floor(s.cash / unit));
  if (cash) { s.cash -= cash * unit; add(s.flow, 'supplies', -cash * unit); }
  if (credit) s.payables.push({ id: ++s.seq, who: 'bakari', amount: credit * unit, due: s.week + P.supplier.term, week: s.week });
  if (cash + credit) s.packs.push({ qty: cash + credit, cost: unit });
  Object.assign(res, { bought: cash + credit, boughtCash: cash, boughtCredit: credit, unit, wanted: want, short: want - cash - credit });
}
function use(s, trays) {
  let left = trays, value = 0;
  for (const layer of s.packs) {
    const take = Math.min(left, layer.qty);
    layer.qty -= take; left -= take; value += take * layer.cost;
  }
  s.packs = s.packs.filter(l => l.qty > 0);
  return { trays: trays - left, value };
}

function trade(s) {
  const startCash = s.lastCash ?? P.cash;
  const res = { week: s.week, days: [], collected: [], late: [], notes: [], invoices: [], rejected: 0, waste: 0 };
  const away = awayMode(s);
  const open = away !== 'close' && away !== 'uncovered';
  const officeOn = open && (s.office || s.trial?.week === s.week);
  res.away = away;
  settleReceivables(s, res);
  payDue(s, res);
  const cap = capacity(s);
  const trays = open ? Math.min(s.plan.trays, cap.trays) : 0;
  Object.assign(res, { planned: s.plan.trays, capacity: cap, trays });
  buy(s, trays, res);
  const pp = pieces_(s), unit = price(s), r = rng(s.seed, 'week', s.week);
  const quality = s.helper ? (s.helper.trained ? pct(P.rejects[s.plan.check], 50) : P.rejects[s.plan.check]) * Math.min(trays, cap.helper) / Math.max(1, trays) : 0;
  const rev = { stall: 0, office: 0, neighbours: 0, school: 0, kiosk: 0 };
  const credit = { school: 0, kiosk: 0 }, owe = {};
  let materials = 0, chai = 0, soldOut = 0;
  for (let d = 0; d < P.days; d++) {
    const made = open ? use(s, trays) : { trays: 0, value: 0 };
    materials += made.value;
    let avail = made.trays * pp;
    const day = { made: made.trays, pieces: avail, school: 0, kiosk: 0, office: 0, neighbours: 0, stall: 0, demand: 0, waste: 0, rain: false };
    const take = n => { const got = Math.min(n, avail); avail -= got; return got; };
    const school = open && s.school ? s.school.pieces : s.trial?.school === s.week && open ? P.school.small : 0;
    if (school) {
      day.school = take(school);
      const bad = Math.floor(day.school * quality / 100);
      res.rejected += bad; day.rejected = bad;
      const value = (day.school - bad) * schoolPrice(s);
      rev.school += value; if (s.school) credit.school += value;
      res.schoolShort = (res.schoolShort || 0) + (school - day.school);
    }
    if (open && s.kiosk) {
      day.kiosk = take(P.kiosk.pieces); rev.kiosk += day.kiosk * P.kiosk.price; credit.kiosk += day.kiosk * P.kiosk.price;
      res.kioskShort = (res.kioskShort || 0) + P.kiosk.pieces - day.kiosk;
    }
    if (officeOn) {
      const buyers = Math.max(0, s.officeBase + between(r, -2, 2));
      const served = Math.min(buyers, Math.floor(avail / P.office.pieces));
      day.office = take(served * P.office.pieces); day.buyers = served;
      rev.office += day.office * unit + served * P.office.chai; chai += served * P.office.chaiCost;
      if (s.trial?.week === s.week) res.trialPaid = (res.trialPaid || 0) + served;
    }
    if (open) for (const [who, c] of Object.entries(s.customers)) {
      if (!c.credit) continue;
      const got = take(P.neighbourPieces); day.neighbours += got;
      owe[who] = (owe[who] || 0) + got * unit; rev.neighbours += got * unit;
    }
    if (open) {
      let demand = pct(pct(P.stallDemand, P.demand[s.plan.price]), between(r, 80, 120));
      if (s.competitor && s.week <= 15) demand = pct(demand, 80);
      if (s.small) demand = pct(demand, 90);
      if (s.week === s.rainWeek && d % 2 === 0) { demand = pct(demand, 60); day.rain = true; }
      day.demand = demand; day.stall = take(demand); rev.stall += day.stall * unit;
      if (demand > day.stall) soldOut++;
    }
    day.waste = avail; res.waste += avail;
    res.days.push(day);
  }
  // Cash sales go into the tin as the week runs; deliveries on credit become invoices.
  const cashSales = rev.stall + rev.office + (s.trial?.school === s.week ? rev.school : 0);
  s.cash += cashSales; add(s.flow, 'sales', cashSales);
  const invoice = (who, amount, term) => {
    if (!amount) return;
    s.receivables.push({ id: ++s.seq, who, amount, week: s.week, due: s.week + term, late: 0, noted: s.notebook });
    res.invoices.push({ who, amount, due: s.week + term });
  };
  invoice('school', credit.school, P.school.term);
  invoice('kiosk', credit.kiosk, 1);
  for (const [who, amount] of Object.entries(owe)) invoice(who, amount, 1);
  const revenue = sum(Object.values(rev));
  add(s.pnl, 'revenue', revenue); add(s.pnl, 'materials', materials); add(s.pnl, 'chai', chai);
  s.cash -= chai; add(s.flow, 'costs', -chai);
  s.totals.revenue += revenue; s.totals.profit += revenue - materials - chai;
  obligation(s, open ? P.fee : 0, 'fee', 'fee');
  if (s.helper) { obligation(s, P.wage, 'wages', 'juma'); s.helper.training = false; }
  if (s.loan) {
    obligation(s, P.loan.interest, 'interest', 'lender');
    const principal = Math.min(P.loan.principal, s.loan.balance);
    const paid = Math.min(principal, s.cash);
    s.cash -= paid; add(s.flow, 'principal', -paid); s.loan.balance -= principal;
    if (principal > paid) s.payables.push({ id: ++s.seq, who: 'lender', amount: principal - paid, due: s.week + 1, week: s.week });
    if (s.loan.balance === 0) { s.loan = null; if (principal === paid && !s.payables.some(x => x.who === 'lender')) thread(s, 'loanRepaid'); }
  }
  let dep = 0;
  for (const e of s.equipment) { const n = Math.min(e.dep, e.book); e.book -= n; dep += n; }
  add(s.pnl, 'depreciation', dep); s.totals.profit -= dep;
  // School and kiosk respond to missed deliveries; declined orders never reach here.
  if (s.school && (res.schoolShort > pct(s.school.pieces * P.days, 20) || away === 'uncovered')) {
    s.school.strikes++; res.notes.push('schoolShort');
    if (s.school.strikes >= 2) { s.school = null; res.notes.push('schoolLost'); thread(s, 'schoolLost'); }
  }
  if (s.kiosk && (res.kioskShort > pct(P.kiosk.pieces * P.days, 20) || away === 'uncovered')) {
    s.kiosk.strikes = (s.kiosk.strikes || 0) + 1; res.notes.push('kioskShort');
    if (s.kiosk.strikes >= 2 || away === 'uncovered') { s.kiosk = null; res.notes.push('kioskLost'); thread(s, 'kioskLost'); }
  }
  if (away === 'cover' && revenue > 0) {
    // Scope: sales happened without the owner while the notebook and a check were in
    // place. The model does not compare a real count with the tin, so claim no more.
    s.awayTraded = (s.awayTraded || 0) + 1;
    s.awayKept = s.notebook && s.plan.check !== 'none';
    thread(s, 'awayCovered');
  } else if (away) thread(s, away === 'close' ? 'awayClosed' : 'awayMissed');
  // Household money last, from what remains.
  const home = Math.min(s.plan.household, s.cash);
  s.cash -= home; add(s.flow, 'household', -home); s.totals.drawings += home;
  if (s.plan.household > 0 && home === s.plan.household) { s.household.paid++; s.household.streak++; }
  else if (s.plan.household > 0) {
    s.household.short++; s.household.streak = 0; s.household.unmet = (s.household.unmet || 0) + s.plan.household - home;
    res.notes.push('householdShort'); res.householdShort = s.plan.household - home;
  }
  if (s.trial?.week === s.week && res.trialPaid !== undefined) {
    res.trial = { paid: Math.round(res.trialPaid / P.days), invited: P.office.invited };
    thread(s, 'trial', res.trial);
  }
  if (s.trial?.school === s.week) thread(s, 'schoolTrialDone', { amount: rev.school });
  // Result: every tin movement since the last week card, and the profit lines.
  const pnl = s.pnl, profit = (pnl.revenue || 0) - sum(Object.entries(pnl).filter(([k]) => k !== 'revenue').map(([, v]) => v));
  Object.assign(res, {
    revenue: rev, sales: revenue, cashSales, creditSales: revenue - cashSales, profit, pnl: { ...pnl }, flow: { ...s.flow },
    cashStart: startCash, cashEnd: s.cash, soldOutDays: soldOut, household: home,
    hours: Math.ceil(hours(cap, sum(res.days.map(d => d.made)) / P.days)), noted: s.notebook, stock: stock(s), owedToYou: owedToYou(s), owedByYou: owedByYou(s),
  });
  res.limit = limit(res);
  s.history.push(res);
  s.lastCash = s.cash; s.flow = {}; s.pnl = {}; s.hours = 0; s.chased = [];
  s.week++;
  if ((s.week - 1) % 4 === 0) { s.phase = 'review'; s.pending = null; } else arrive(s);
  return res;
}

// Which stage limited the week, from the result alone.
export function limit(res) {
  if (!res || !res.trays && !res.planned) return '';
  if (res.short > 0) return 'buy';
  if (res.soldOutDays >= 3) return res.planned > res.capacity.trays ? (res.capacity.by === 'pots' ? 'pots' : 'hours') : 'plan';
  if (res.waste > res.trays * P.days * P.pieces * 15 / 100) return 'demand';
  if (res.owedToYou > res.cashEnd && res.owedToYou > 0) return 'collect';
  return '';
}

// ---- why things happened ------------------------------------------------------
// A week can raise two questions: what held trading back, and why the tin moved
// differently from profit. Each answer comes from the saved week. A topic is explained
// outright the first two times it appears; after that the learner is asked first and
// the answer is recorded (D-067). A topic repeated from the week before is not raised.
const HELD = { buy: 'buy', pots: 'cook', hours: 'cook', plan: 'plan', demand: 'demand', collect: 'collect' };
export const WHY = { held: ['buy', 'cook', 'plan', 'demand', 'collect'], gap: ['credit', 'household', 'stock', 'other'] };
export function gapParts(r) {
  const f = k => r.flow[k] || 0;
  const credit = r.creditSales - f('collected'), household = -f('household');
  const stock = -f('supplies') - f('supplier') - (r.pnl.materials || 0);
  return { credit, household, stock, other: r.profit - (r.cashEnd - r.cashStart) - credit - household - stock };
}
function topic(r, kind) {
  if (kind === 'held') return HELD[r.limit] || '';
  if (Math.abs(r.profit - (r.cashEnd - r.cashStart)) < Math.max(1000, r.sales / 5)) return '';
  return Object.entries(gapParts(r)).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0];
}
export function causes(history) {
  const r = history.at(-1);
  if (!r) return [];
  return Object.keys(WHY).flatMap(kind => {
    const key = topic(r, kind);
    if (!key || (history.length > 1 && topic(history.at(-2), kind) === key)) return [];
    const starts = history.slice(0, -1).filter((x, i) => topic(x, kind) === key && (i === 0 || topic(history[i - 1], kind) !== key)).length;
    return [{ kind, key, week: r.week, ask: starts >= 2 }];
  });
}

// ---- dispatcher -------------------------------------------------------------

export function step(state, action) {
  const s = structuredClone(state);
  const need = phase => { if (s.phase !== phase && !(phase === 'plan' && s.phase === 'event' && action.type !== 'run')) fail('phase'); };
  let result = {};
  switch (action?.type) {
    case 'plan': {
      need('plan');
      const next = { ...s.plan, ...action.patch };
      for (const [k, [lo, hi]] of Object.entries(PLAN_LIMITS)) if (!Number.isSafeInteger(next[k]) || next[k] < lo || next[k] > hi) fail('plan');
      if (next.household % 100 || !STEPS.includes(next.price) || !['cash', 'credit'].includes(next.pay) ||
        ![1, 2].includes(next.buyWeeks) || !(next.check in P.checkHours)) fail('plan');
      s.plan = next; result = { plan: next };
      break;
    }
    case 'run': need('plan'); result = trade(s); break;
    case 'answer': result = answer(s, action.option); break;
    case 'buyPot': need('plan'); if (s.pots >= P.pot.max || s.cash < P.pot.cost) fail('pot'); buyEquipment(s, 'pot'); break;
    case 'sellPot': {
      need('plan');
      const i = s.equipment.findLastIndex(e => e.kind === 'pot');
      if (i < 0) fail('pot');
      const [pot] = s.equipment.splice(i, 1); s.pots--;
      s.cash += P.pot.resale; add(s.flow, 'equipmentSold', P.pot.resale);
      const loss = pot.book - P.pot.resale; add(s.pnl, 'other', loss); s.totals.profit -= loss;
      result = { loss };
      break;
    }
    case 'borrow': need('plan'); borrow(s); break;
    case 'trainHelper': need('plan'); if (!s.helper || s.helper.trained) fail('helper'); cost(s, P.training, 'other'); s.helper.trained = true; s.helper.training = true; break;
    case 'endHelper': need('plan'); if (!s.helper) fail('helper'); s.helper = null; break;
    case 'repay': need('plan'); if (!s.loan || s.cash < s.loan.balance) fail('repay'); spend(s, s.loan.balance, 'principal'); s.loan = null; if (!s.payables.some(x => x.who === 'lender')) thread(s, 'loanRepaid'); break;
    case 'chase': {
      need('plan');
      // Only invoices already due: asking early does not shorten agreed payment terms.
      const mine = s.receivables.filter(x => x.who === action.who && x.due <= s.week);
      if (!mine.length || s.chased.includes(action.who)) fail('chase');
      s.chased.push(action.who); s.hours += 1;
      const base = action.who === 'school' ? P.school.pay : action.who === 'kiosk' ? P.kiosk.pay : P.neighbours[action.who];
      const paid = rng(s.seed, 'chase', action.who, s.week)() * 100 < base - 20 + 10 * Math.max(...mine.map(x => x.late));
      if (paid) for (const x of mine) collect(s, x, null);
      result = { who: action.who, paid, amount: paid ? sum(mine.map(x => x.amount)) : 0 };
      break;
    }
    case 'credit': need('plan'); if (!s.customers[action.who]) fail('who'); s.customers[action.who].credit = !!action.on; break;
    case 'notebook': need('plan'); s.notebook = !!action.on; if (s.notebook) s.notebookFrom = s.week; break;
    case 'why': {
      const c = causes(s.history).find(x => x.kind === action.kind);
      if (s.phase === 'closed' || !c?.ask || s.whys?.some(w => w.week === c.week && w.kind === c.kind) || ![...WHY[c.kind], 'unsure'].includes(action.pick)) fail('why');
      result = { week: c.week, kind: c.kind, key: c.key, pick: action.pick, matched: action.pick === c.key };
      (s.whys ||= []).push(result); // Absent from older records, so they still replay exactly.
      break;
    }
    case 'help': result = { limit: limit(s.history.at(-1)), week: s.week }; s.help.push(s.week); break;
    case 'goal': if (!['income', 'customers', 'away'].includes(action.goal) || s.week < 5) fail('goal'); s.goal = action.goal; s.goals.push({ week: s.week, goal: action.goal }); break;
    case 'review': need('review'); if (s.week > WEEKS && !s.finished) { s.finished = true; } arrive(s); break;
    case 'close': if (s.phase === 'closed') fail('phase'); s.phase = 'closed'; s.pending = null; break;
    default: fail('action');
  }
  return { state: s, result };
}

export function can(state, action) {
  try { step(state, action); return true; } catch { return false; }
}

export function replay(seed, actions) {
  let s = createSeason({ seed });
  for (const a of actions) s = step(s, a).state;
  return s;
}

// A routine week: no event or month close waiting, the away week is not next, and the
// tin covers the planned batch and household money. Events and closes stop the loop.
export function quiet(s) {
  if (s.phase !== 'plan') return false;
  const trays = Math.min(s.plan.trays, capacity(s).trays);
  const cost = Math.max(0, trays * P.days - stock(s)) * packCost(s);
  return s.cash >= cost + s.plan.household && s.week !== P.awayWeek;
}

export function facts(s) {
  const last = s.history.slice(-4);
  const business = ['office', 'school', 'kiosk'].filter(k => s[k] && last.some(r => r.revenue[k] > 0)).length;
  return {
    weeks: s.history.length, householdPaid: s.household.paid, householdShort: s.household.short, streak: s.household.streak,
    householdUnmet: s.household.unmet || 0, paymentsUnmet: sum(s.payments.map(p => p.status === 'missed' ? p.amount - p.paidPart : 0)),
    buffer: s.plan.household ? Math.floor(s.cash / s.plan.household) : 0,
    hours: last.length ? Math.round(sum(last.map(r => r.hours)) / last.length) : 0,
    business, awayTraded: s.awayTraded || 0, awayKept: !!s.awayKept,
    owedToYou: owedToYou(s), owedByYou: owedByYou(s), people: s.helper ? 1 : 0,
    sales: s.totals.revenue, profit: s.totals.profit, drawings: s.totals.drawings, cash: s.cash,
    stock: stock(s), stockValue: stockValue(s), equipment: book(s),
    payments: s.payments.map(p => ({ week: p.week, amount: p.amount, status: p.status })),
  };
}

// Goal progress as facts against the prototype targets; reaching one is not ranked.
export function goalProgress(s) {
  const f = facts(s);
  const onTime = ['school', 'kiosk'].every(k => !s[k] || !s.receivables.some(x => x.who === k && x.late));
  return {
    income: { now: [Math.min(f.streak, 8), Math.min(f.buffer, 4)], of: [8, 4], reached: f.streak >= 8 && f.buffer >= 4 },
    customers: { now: [f.business], of: [3], reached: f.business >= 3 && onTime },
    away: { now: [f.awayTraded && f.awayKept ? 1 : 0], of: [1], reached: !!f.awayTraded && f.awayKept },
  };
}
