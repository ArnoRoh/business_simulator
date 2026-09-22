import { startRun, currentBeat, steps, transaction, choose, advance, finish, validRun } from './entrymodel.js';
import { loadStrings, setLanguage, localised, t, getLanguage } from './i18n.js';
import { setCurrency, money } from './format.js';

const KEY = 'business-simulator:asha-intro:v3';
const $ = id => document.getElementById(id);
let game, run, saved = true, blocked = false, rawSave = '', offline = false, conflict = false;
const practiceURL = location.protocol === 'file:' ? 'https://arnoroh.github.io/business_simulator/practice.html' : './practice.html';
const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};
const text = value => localised(value).replace(/\{(\d+)\}/g, (_, n) => money(Number(n)));
function button(label, action, className = 'primary') {
  const el = node('button', className, label); el.type = 'button'; el.onclick = action; return el;
}
function download(value, name = 'MV-BS-INTRO-record.json') {
  const url = URL.createObjectURL(new Blob([typeof value === 'string' ? value : JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = node('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function save() {
  if (blocked) return;
  try {
    if ((localStorage.getItem(KEY) || '') !== rawSave) { conflict = true; saved = false; status(); return; }
    const next = JSON.stringify(run);
    localStorage.setItem(KEY, next); rawSave = next; saved = true;
  }
  catch { saved = false; }
  status();
}
function status() {
  $('save-status').textContent = t(conflict ? 'conflict' : saved ? 'saved' : 'failed');
  $('retry').hidden = saved || blocked || conflict; $('retry').textContent = t('retry');
  $('offline-status').textContent = t(offline ? 'offline' : 'online');
}
function commit(option) {
  run = choose(run, option.id); save(); render(true);
}
function restart() {
  if (!confirm(t('confirm'))) return;
  // Preserve old bytes even when replacing a save we cannot understand.
  if (blocked) {
    try { localStorage.setItem(KEY + ':unreadable', rawSave); }
    catch { download(rawSave, 'MV-BS-INTRO-unreadable.json'); return; }
  }
  blocked = false; conflict = false; run = startRun(game); save(); render(true);
}
function row(list, label, amount) {
  const line = node('div', 'money-row'); line.append(node('dt', '', label), node('dd', '', money(amount))); list.append(line);
}
function accounts(parent, observation) {
  const details = node('details', 'accounts'); details.append(node('summary', '', t('accounts')));
  const list = node('dl');
  if (observation) {
    row(list, t('in'), observation.receipts); row(list, t('out'), observation.payments);
  }
  for (const key of ['cash', 'stock', 'receivable', 'debt']) row(list, t(key), run.state[key]);
  row(list, t('net'), run.state.cash + run.state.stock + run.state.receivable - run.state.debt);
  details.append(list); parent.append(details);
  if (run.state.cash < run.scenario.nextBatchCost) parent.append(node('p', 'body cash-warning', text(run.scenario.ui.cashWarning)));
}
function chrome() {
  document.title = text(game.title);
  $('brand-name').textContent = text(game.title); $('brand-sub').textContent = t('subtitle');
  $('sample').textContent = t('sample'); $('practice').textContent = t(location.protocol === 'file:' ? 'fullOnline' : 'practice');
  $('practice').href = practiceURL;
  $('offline-file').textContent = t('offlineFile');
  $('offline-file').hidden = location.protocol === 'file:';
  $('old-download').textContent = t('raw');
  $('download').textContent = t('download'); $('lang-btn').textContent = getLanguage() === 'en' ? 'Kiswahili' : 'English';
  $('lang-btn').lang = getLanguage() === 'en' ? 'sw' : 'en';
  const day = currentBeat(run)?.dayIndex ?? 4;
  $('progress').replaceChildren();
  run.scenario.days.forEach((d, i) => {
    const item = node('div', 'progress-day'); const dot = node('div', 'dot');
    const fill = node('div', 'dot-fill');
    const daySteps = steps(run).filter(b => b.dayIndex === i);
    const done = run.observations.filter(o => daySteps.some(b => b.id === o.beatId)).length;
    fill.style.width = `${done / daySteps.length * 100}%`; dot.append(fill);
    item.append(dot, node('span', 'dot-label', String(i + 1)));
    if (day === i) item.setAttribute('aria-current', 'step');
    $('progress').append(item);
  });
  $('progress').setAttribute('aria-label', t('day', { n: day + 1 }));
  renderScene(day);
  const hud = $('hud'); hud.replaceChildren();
  hud.append(node('div', 'hud-pill cash', `${t('cash')}: ${money(run.state.cash)}`));
  if (run.state.debt) hud.append(node('div', 'hud-pill', `${t('debt')}: ${money(run.state.debt)}`));
  status();
}
function render(focus = false) {
  chrome();
  const card = $('card'); card.replaceChildren(); $('mini').replaceChildren();
  if (blocked) {
    card.append(node('p', 'body', t('invalid')), button(t('raw'), () => download(rawSave)), button(t('replay'), restart, 'ghost'));
    $('save-status').textContent = t('invalid'); return;
  }
  if (run.phase === 'complete') {
    card.append(node('h1', 'title', t('done')), node('p', 'body', t('limit')));
    if (run.note) card.append(node('h2', 'mini-title', t('endnote')), node('p', 'body', run.note));
    card.append(node('p', 'body', t(run.trajectory === 'organisation' ? 'learn' : 'steady')));
    const link = node('a', 'primary', t(location.protocol === 'file:' ? 'fullOnline' : 'practice')); link.href = practiceURL; card.append(link);
    accounts(card); card.append(button(t('replay'), restart, 'ghost'));
  } else {
    const beat = currentBeat(run);
    card.append(node('p', 'kicker', `${t('day', { n: beat.dayIndex + 1 })} · ${text(run.scenario.days[beat.dayIndex].label)}`));
    if (run.phase === 'result') {
      const observation = run.observations.at(-1);
      const option = beat.options.find(o => o.id === observation.optionId);
      // Keep the explanation that was shown when the learner made the choice.
      card.append(node('h1', 'title', text(option?.label || beat.title)), node('p', 'body', text(observation.outcome)));
      const delta = observation.after.cash - observation.before.cash;
      card.append(node('p', 'cash-change pulse', `${t('change')}: ${delta > 0 ? '+' : ''}${money(delta)}`));
      const ledger = node('dl'); row(ledger, t('in'), observation.receipts); row(ledger, t('out'), observation.payments); card.append(ledger);
      card.append(button(t('next'), () => { run = advance(run); save(); render(true); }));
      accounts(card, observation);
    } else {
      card.append(node('h1', 'title', text(beat.title)), node('p', 'body', text(beat.body)));
      if (beat.kind === 'note') {
        const label = node('label', '', t('note')); label.htmlFor = 'note';
        const input = node('textarea'); input.id = 'note'; input.rows = 3; input.maxLength = 1000; input.value = run.note;
        input.oninput = () => { run.note = input.value; save(); };
        card.append(label, input, button(t('finish'), () => { run = finish(run); save(); render(true); }));
      } else {
        const choices = node('div', 'choices');
        for (const option of beat.options) {
          const choice = button(text(option.label), () => commit(option), 'choice');
          choice.dataset.option = option.id;
          try { transaction(run.state, option); }
          catch { choice.disabled = true; choice.append(node('span', '', t('unavailable'))); }
          choices.append(choice);
        }
        card.append(choices);
      }
      accounts(card);
    }
  }
  if (focus) { card.focus({ preventScroll: true }); card.scrollIntoView({ block: 'start', behavior: 'instant' }); }
}

function renderScene(dayIdx){
  const day = dayIdx+1;
  const time = ['dawn','morning','noon','afternoon','sunset'][Math.min(4,dayIdx)];
  const colors = {dawn:'#ffe9c2', morning:'#fff6ea', noon:'#fff', afternoon:'#fff6ea', sunset:'#ffd9a0'};
  const sky = colors[time];
  const stallColor = day>3 ? '#ff7a18' : '#0f766e';
  const crowd = 3;
  const svg = `
  <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img">
    <rect width="400" height="260" rx="22" fill="${sky}"/>
    <circle cx="340" cy="40" r="18" fill="#facc15" opacity=".9"/>
    <g opacity=".15">
      <ellipse cx="70" cy="48" rx="30" ry="12" fill="#fff"/>
      <ellipse cx="120" cy="38" rx="24" ry="9" fill="#fff"/>
    </g>
    <!-- stall -->
    <rect x="90" y="120" width="220" height="90" rx="14" fill="#fff" stroke="#f0ddbd" stroke-width="2"/>
    <rect x="80" y="110" width="240" height="22" rx="8" fill="${stallColor}"/>
    <rect x="90" y="132" width="220" height="6" rx="3" fill="#1a140e" opacity=".08"/>
    <!-- mandazi stacks -->
    <g>
      <ellipse cx="150" cy="175" rx="28" ry="10" fill="#fde9c7"/>
      <circle cx="140" cy="168" r="10" fill="#facc15" stroke="#e6a20a" stroke-width="1.5"/>
      <circle cx="158" cy="165" r="11" fill="#fdba74" stroke="#d97706" stroke-width="1.5"/>
      <circle cx="150" cy="154" r="9" fill="#ffedd5" stroke="#fdba74" stroke-width="1.5"/>
    </g>
    <g>
      <ellipse cx="250" cy="175" rx="28" ry="10" fill="#fde9c7"/>
      <circle cx="240" cy="168" r="10" fill="#facc15" stroke="#e6a20a" stroke-width="1.5"/>
      <circle cx="260" cy="165" r="11" fill="#fdba74" stroke="#d97706" stroke-width="1.5"/>
    </g>
    <!-- Asha -->
    <g>
      <circle cx="200" cy="108" r="16" fill="#a67c52"/>
      <path d="M186 122 Q200 132 214 122 L210 105 L190 105 Z" fill="${stallColor}"/>
      <circle cx="194" cy="107" r="1.5" fill="#1a140e"/><circle cx="206" cy="107" r="1.5" fill="#1a140e"/>
      <path d="M196 114 Q200 118 204 114" stroke="#1a140e" fill="none" stroke-width="1.3" stroke-linecap="round"/>
    </g>
    <!-- customers -->
    <g>
      ${Array.from({length:crowd},(_,i)=>{
        const x = 30 + i*52 + (i%2?6:0);
        const y = 210 - (i%3?0:8);
        return `<g>
          <circle cx="${x}" cy="${y-12}" r="9" fill="#c9a88a"/>
          <rect x="${x-10}" y="${y}" width="20" height="14" rx="6" fill="#fff6ea" stroke="#f0ddbd"/>
          <circle cx="${x-2}" cy="${y-14}" r="1.2" fill="#1a140e"/><circle cx="${x+4}" cy="${y-14}" r="1.2" fill="#1a140e"/>
        </g>`;
      }).join('')}
    </g>
    <!-- cash tin -->
    <g>
      <rect x="310" y="160" width="36" height="28" rx="6" fill="#1a140e"/>
      <rect x="314" y="164" width="28" height="4" rx="2" fill="#facc15" opacity=".9"/>

    </g>
  </svg>`;
  $('scene').innerHTML = svg;
}

async function init() {
  const response = await fetch('./content/game.json');
  if (!response.ok) throw new Error('Content unavailable');
  game = await response.json();
  loadStrings(game.ui);
  try { setLanguage(localStorage.getItem('asha-language') || 'en'); } catch { setLanguage('en'); }
  run = startRun(game);
  let previous = '';
  try {
    rawSave = localStorage.getItem(KEY) || '';
    if (rawSave) {
      const parsed = JSON.parse(rawSave);
      if (validRun(parsed)) run = parsed;
      else blocked = true;
    }
    previous = localStorage.getItem('asha-stall-v2') || '';
  } catch { if (rawSave) blocked = true; else saved = false; }
  setCurrency(run.scenario.currency);
  loadStrings(run.scenario.ui);
  $('lang-btn').onclick = () => {
    setLanguage(getLanguage() === 'en' ? 'sw' : 'en');
    try { localStorage.setItem('asha-language', getLanguage()); } catch { /* Language still works without storage. */ }
    render();
  };
  $('download').onclick = () => download(blocked ? rawSave : run);
  $('retry').onclick = save;
  const isNew = !rawSave;
  if (!blocked) save();
  render();
  if (previous) {
    $('old-download').hidden = false;
    $('old-download').onclick = () => download(previous, 'MV-BS-INTRO-previous.json');
    if (isNew) $('mini').append(node('p', 'body', t('previous')));
  }
  if (location.protocol === 'file:') { offline = true; status(); }
  else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(async () => {
      // The old worker can remain active during an update. Check the cached entry assets.
      const cacheNames = await caches.keys();
      offline = (await Promise.all(cacheNames.map(async name => {
        const cache = await caches.open(name);
        return Boolean(await cache.match('./js/entry.js') && await cache.match('./content/game.json'));
      }))).some(Boolean);
      status();
    }).catch(() => { offline = false; status(); });
  }
}
init().catch(() => {
  $('card').replaceChildren(node('p', 'body', 'Could not open the game. Reconnect and reload. / Mchezo haujafunguka. Unganisha intaneti na ujaribu tena.'),
    button('Reload / Fungua tena', () => location.reload()));
});
