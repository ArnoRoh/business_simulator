// The stall as one illustrated SVG street scene. Its parts are drawn from saved state
// only: jikos (pots), mandazi in the basket (daily trays), flour sacks, helper, customers,
// cash tin, invoices, notebook, price board and the buyers who have appeared. A finished
// week replays as a short CSS animation of its saved day results; nothing here decides
// an outcome. Reduced motion or "skip" shows the final picture at once.
// With the previous picture (prev), parts that were added pop in, the price board flips
// and cash moved outside trading flies into or out of the tin, so every action is seen.
const W = 360, H = 268, OL = '#3b2415', FG = 18; // FG: the counter and street sit lower than the awning.
const cap = (n, max) => Math.max(0, Math.min(max, n));
const SKIN = ['#8a5a3b', '#6b4226', '#a0694a', '#5a3620'];
const CLOTH = ['#0ea5e9', '#f97316', '#a855f7', '#e11d48', '#16a34a', '#eab308'];

// A cartoon person standing with feet at (x, y). o: skin, cloth, wrap (head scarf colour),
// cap (cap colour), apron, mood ('' | 'happy' | 'cross'), s (scale), cls.
function person(x, y, o = {}) {
  const s = o.s || 1, mood = o.mood || '';
  const mouth = mood === 'cross' ? 'M-3 -34.5 q3 -2.5 6 0' : 'M-3.2 -36 q3.2 3 6.4 0';
  const hat = o.wrap ? `<path d="M-10.5 -41 Q-11 -55 0 -55 Q11 -55 10.5 -41 Q0 -46 -10.5 -41 Z" fill="${o.wrap}" stroke="${OL}" stroke-width="1.4"/><circle cx="8" cy="-52" r="3.5" fill="${o.wrap}" stroke="${OL}" stroke-width="1.2"/>`
    : o.cap ? `<path d="M-9 -44 Q0 -55 9 -44 Z" fill="${o.cap}" stroke="${OL}" stroke-width="1.4"/><rect x="-1" y="-45.5" width="13" height="3" rx="1.5" fill="${o.cap}" stroke="${OL}" stroke-width="1"/>`
    : `<path d="M-9 -43 Q0 -54 9 -43 Q5 -47 0 -47 Q-5 -47 -9 -43 Z" fill="#1f160e"/>`;
  return `<g class="p ${o.cls || ''}" transform="translate(${x} ${y}) scale(${s})"><ellipse rx="11" ry="3" fill="#0000001f"/>
<g class="bob"><rect x="-6" y="-13" width="4.5" height="13" rx="2" fill="#3b3024"/><rect x="1.5" y="-13" width="4.5" height="13" rx="2" fill="#3b3024"/>
<path d="M-10 -11 Q-12 -31 0 -32 Q12 -31 10 -11 Z" fill="${o.cloth || CLOTH[0]}" stroke="${OL}" stroke-width="1.4"/>
${o.apron ? `<path d="M-6 -27 h12 v14 q-6 3 -12 0 z" fill="#fff" stroke="${OL}" stroke-width="1"/>` : ''}
<circle cy="-40" r="9.5" fill="${o.skin || SKIN[0]}" stroke="${OL}" stroke-width="1.4"/>${hat}
<circle cx="-3.3" cy="-41" r="1.4" fill="#1f160e"/><circle cx="3.3" cy="-41" r="1.4" fill="#1f160e"/>
<circle cx="-6" cy="-37.5" r="1.8" fill="#f472b6" opacity=".45"/><circle cx="6" cy="-37.5" r="1.8" fill="#f472b6" opacity=".45"/>
<path d="${mouth}" fill="none" stroke="#1f160e" stroke-width="1.3" stroke-linecap="round"/></g></g>`;
}

const mandazi = (x, y, cls = '') => `<path class="mz${cls}" d="M${x} ${y} l6.5 -10 l6.5 10 q-6.5 2 -13 0 z" fill="#f2a93b" stroke="${OL}" stroke-width="1.1" stroke-linejoin="round"/>`;
const coin = (x, y, cls, style = '') => `<g class="fx ${cls}" style="${style}"><circle cx="${x}" cy="${y}" r="5" fill="#fbbf24" stroke="#a16207" stroke-width="1.3"/><path d="M${x - 1.5} ${y - 2.5} v5" stroke="#fff7c2" stroke-width="1.4"/></g>`;

// Tin fill: 0..1 of a sample scale; the label, not the height, carries the amount.
export const level = cash => cap(cash / 40000, 1);

function jiko(cx, base, cls) {
  return `<g class="pot${cls}"><path class="steam" d="M${cx - 6} ${base - 34} q-5 -8 0 -14 q5 -6 0 -12 M${cx + 6} ${base - 34} q-5 -8 0 -14 q5 -6 0 -12" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
<path d="M${cx - 14} ${base - 22} l4 22 h20 l4 -22 z" fill="#475569" stroke="${OL}" stroke-width="1.4"/><ellipse class="coal" cx="${cx}" cy="${base - 22}" rx="13" ry="3.5" fill="#f97316"/>
<path d="M${cx - 19} ${base - 27} q19 14 38 0 z" fill="#1f2937" stroke="${OL}" stroke-width="1.4"/><ellipse cx="${cx}" cy="${base - 27}" rx="17" ry="3.2" fill="#f59e0b"/>
<g class="fry">${mandazi(cx - 12, base - 26)}${mandazi(cx + 1, base - 26)}</g><circle class="bubble" cx="${cx + 10}" cy="${base - 28}" r="1.5" fill="#fde68a"/></g>`;
}

function buildings(view, prev) {
  const pop = key => prev && !prev[key] ? ' new' : '';
  const win = (x, y) => `<rect x="${x}" y="${y}" width="9" height="10" rx="1.5" fill="#1e3a8a" opacity=".35"/>`;
  return `<g class="bg">
<rect x="-4" y="98" width="66" height="64" fill="#fda4af" stroke="${OL}" stroke-width="1.4"/>${win(8, 108)}${win(26, 108)}${win(44, 108)}<rect x="22" y="136" width="14" height="26" fill="#9f1239" opacity=".6"/>
${view.office ? `<g class="bld${pop('office')}"><rect x="84" y="70" width="66" height="92" fill="#cbd5e1" stroke="${OL}" stroke-width="1.4"/>${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => win(90 + c * 15, 78 + r * 16)).join('')).join('')}<rect x="84" y="66" width="66" height="6" fill="#64748b" stroke="${OL}" stroke-width="1.2"/></g>`
    : `<rect x="86" y="108" width="62" height="54" fill="#93c5fd" stroke="${OL}" stroke-width="1.4"/>${win(96, 118)}${win(126, 118)}`}
<rect x="150" y="112" width="64" height="50" fill="#fde68a" stroke="${OL}" stroke-width="1.4"/>
${view.kiosk ? `<g class="bld${pop('kiosk')}"><rect x="220" y="104" width="54" height="58" fill="#bae6fd" stroke="${OL}" stroke-width="1.4"/><path d="M214 104 h66 l-5 12 h-56 z" fill="#0369a1" stroke="${OL}" stroke-width="1.4"/><rect x="228" y="124" width="38" height="20" fill="#fff" stroke="${OL}" stroke-width="1"/><rect x="232" y="128" width="5" height="12" fill="#16a34a"/><rect x="241" y="128" width="5" height="12" fill="#dc2626"/><rect x="250" y="128" width="5" height="12" fill="#eab308"/></g>`
    : `<rect x="216" y="100" width="64" height="62" fill="#86efac" stroke="${OL}" stroke-width="1.4"/>${win(228, 112)}${win(258, 112)}`}
${view.school ? `<g class="bld${pop('school')}"><path d="M284 96 l38 -26 l38 26 z" fill="#dc2626" stroke="${OL}" stroke-width="1.4"/><rect x="288" y="96" width="70" height="66" fill="#fef08a" stroke="${OL}" stroke-width="1.4"/><rect x="316" y="130" width="14" height="32" fill="#92400e"/>${win(296, 106)}${win(338, 106)}<path d="M322 70 v-26" stroke="${OL}" stroke-width="1.6"/><path class="flag" d="M322 44 h16 l-3 5 l3 5 h-16 z" fill="#16a34a" stroke="${OL}" stroke-width="1"/></g>`
    : `<rect x="282" y="94" width="78" height="68" fill="#c4b5fd" stroke="${OL}" stroke-width="1.4"/>${win(294, 106)}${win(318, 106)}${win(342, 106)}`}
<g class="palm"><path d="M74 162 q-2 -30 6 -58" fill="none" stroke="#92400e" stroke-width="6" stroke-linecap="round"/><path d="M80 104 q-22 -8 -34 8 q16 -6 34 -8 z M80 104 q20 -10 34 4 q-16 -4 -34 -4 z M80 104 q-8 -18 -24 -20 q12 8 24 20 z M80 104 q10 -18 26 -18 q-14 6 -26 18 z" fill="#22c55e" stroke="${OL}" stroke-width="1.2"/></g></g>`;
}

export function drawScene(view, prev = null) {
  const fresh = (i, before) => prev && i >= before ? ' new' : '';
  const trays = cap(view.trays, 15), packs = cap(Math.ceil(view.stock / 6), 6);
  const queue = cap(Math.round(view.queue / 9), 8), papers = cap(view.invoices, 6);
  // One mandazi per daily tray, piled in the basket: rows of 5, 4, 3, 2, 1.
  let pile = '', n = 0;
  for (const [row, count] of [5, 4, 3, 2, 1].entries()) for (let i = 0; i < count && n < trays; i++, n++)
    pile += mandazi(185 - count * 6.5 + i * 13 - 6.5, 157 - row * 8, fresh(n, prev?.trays));
  const pots = Array.from({ length: view.pots }, (_, i) => jiko(78 - i * 32, 222 - (i === 2 ? 6 : 0), fresh(i, prev?.pots))).join('');
  const sacks = Array.from({ length: packs }, (_, i) => {
    const row = i < 3 ? 0 : i < 5 ? 1 : 2, col = i < 3 ? i : i < 5 ? i - 3 : 0, x = 268 + col * 13 + row * 6.5, y = 238 - row * 12;
    return `<path class="sack${fresh(i, prev && Math.ceil(prev.stock / 6))}" d="M${x} ${y} q-3 -14 3 -16 l2 -3 l2 3 q6 2 3 16 z" fill="#f5f0e6" stroke="${OL}" stroke-width="1.2"/>`;
  }).join('');
  const people = Array.from({ length: queue }, (_, i) => i).reverse().map(i => {
    const row = Math.floor(i / 4), col = i % 4;
    return person(296 + col * 16 - row * 7, 228 - row * 11, { s: .95 - row * .08, skin: SKIN[i % 4], cloth: CLOTH[(i + 1) % 6], wrap: i % 3 === 1 ? CLOTH[(i + 3) % 6] : '', cap: i % 3 === 2 ? CLOTH[(i + 4) % 6] : '', cls: `cust c${i}` });
  }).join('');
  const clip = Array.from({ length: papers }, (_, i) => `<rect class="paper${fresh(i, prev?.invoices)}" x="${257 - i}" y="${128 + i * 2}" width="12" height="14" rx="1" fill="#fff" stroke="#94a3b8"/>`).join('');
  // Cash moved by a plan action (loan, pot, wage, collection): coins to or from the tin.
  const up = prev && view.cash > prev.cash;
  const moved = prev && view.cash !== prev.cash ? [0, 1, 2].map(i => coin(up ? 40 : 125, up ? 60 : 146, up ? 'cashin' : 'cashout', `--i:${i}`)).join('') : '';
  const stripes = Array.from({ length: 8 }, (_, i) => `<rect x="${92 + i * 22}" y="96" width="22" height="36" fill="${i % 2 ? '#fff' : '#ef4444'}"/>`).join('');
  let scallop = 'M92 96 H268 V120';
  for (let i = 0; i < 8; i++) scallop += ' a11 9 0 0 1 -22 0';
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="${view.rain ? 'rain' : ''}">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#fff1cc"/></linearGradient>
<linearGradient id="road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eccb91"/><stop offset="1" stop-color="#d9a864"/></linearGradient>
<linearGradient id="front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#0f766e"/></linearGradient>
<clipPath id="aw"><path d="${scallop} z"/></clipPath></defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<circle cx="318" cy="84" r="26" fill="#fff3b0" opacity=".6"/><circle class="sun" cx="318" cy="84" r="15" fill="#fcd34d" stroke="#f59e0b" stroke-width="1.5"/>
<g class="cloud"><circle cx="40" cy="92" r="9" fill="#fff"/><circle cx="52" cy="88" r="12" fill="#fff"/><circle cx="66" cy="93" r="8" fill="#fff"/></g>
<g class="cloud c2"><circle cx="210" cy="80" r="7" fill="#fff"/><circle cx="220" cy="76" r="10" fill="#fff"/><circle cx="232" cy="81" r="7" fill="#fff"/></g>
${buildings(view, prev)}
<rect y="160" width="${W}" height="18" fill="#f6dcae"/><path d="M0 160 H${W}" stroke="${OL}" stroke-width="1.2" opacity=".5"/><rect y="176" width="${W}" height="${H - 176}" fill="url(#road)"/>
<rect x="104" y="112" width="152" height="66" fill="#fef3c7" stroke="${OL}" stroke-width="1.2"/>
<rect x="100" y="104" width="8" height="122" fill="#a8683a" stroke="${OL}" stroke-width="1.3"/><rect x="252" y="104" width="8" height="122" fill="#a8683a" stroke="${OL}" stroke-width="1.3"/>
<g clip-path="url(#aw)">${stripes}</g><path d="${scallop} z" fill="none" stroke="${OL}" stroke-width="1.5"/>
<path d="M150 96 l6 -8 M210 96 l-6 -8" stroke="${OL}" stroke-width="1.3"/><rect x="138" y="72" width="84" height="18" rx="6" fill="#7c2d12" stroke="${OL}" stroke-width="1.4"/><text x="180" y="85.5" class="brand">MANDAZI</text>
${view.helper ? person(136, 188, { skin: SKIN[1], cloth: '#2563eb', cap: '#1e3a8a', s: 1.25, cls: `juma${prev && !prev.helper ? ' new' : ''}` }) : ''}
${view.owner ? person(232, 188, { skin: SKIN[0], cloth: '#ea580c', wrap: '#7c3aed', apron: true, s: 1.35, cls: 'owner' }) : ''}
<g transform="translate(0 ${FG})">
<rect x="96" y="158" width="168" height="9" rx="3" fill="#d6a064" stroke="${OL}" stroke-width="1.3"/>
<rect x="100" y="167" width="160" height="40" fill="url(#front)" stroke="${OL}" stroke-width="1.4"/><path d="M100 176 ${Array.from({ length: 16 }, (_, i) => `l5 -6 l5 6`).join(' ')}" fill="none" stroke="#fff" stroke-width="1.5" opacity=".35"/><path d="M100 198 H260" stroke="#fde68a" stroke-width="3" opacity=".6"/>
<ellipse cx="185" cy="158" rx="36" ry="5" fill="#b45309" stroke="${OL}" stroke-width="1.2"/><g class="pile">${pile}</g>
${view.notebook ? `<g class="book${prev && !prev.notebook ? ' new' : ''}"><rect x="232" y="147" width="18" height="12" rx="1.5" fill="#1d4ed8" stroke="${OL}" stroke-width="1.1"/><path d="M241 147 v12" stroke="#fff" stroke-width="1"/></g>` : ''}
<g class="tin"><rect x="112" y="136" width="26" height="23" rx="3" fill="#475569" stroke="${OL}" stroke-width="1.3"/><rect class="fill" x="115" y="139" width="20" height="18" fill="#facc15" style="transform:scaleY(${level(prev ? prev.cash : view.cash)})"/><rect x="110" y="133" width="30" height="5" rx="2" fill="#64748b" stroke="${OL}" stroke-width="1.2"/></g>
<g class="clip"><rect x="254" y="124" width="18" height="24" rx="2" fill="#92400e" stroke="${OL}" stroke-width="1.2"/>${clip}</g>
${pots}
<g class="bin"><path d="M88 222 h16 l-2 22 h-12 z" fill="#6b7280" stroke="${OL}" stroke-width="1.2"/><rect x="86" y="219" width="20" height="4" rx="2" fill="#4b5563" stroke="${OL}" stroke-width="1"/></g>
<g class="price${prev && prev.price !== view.price ? ' new' : ''}"><path d="M118 246 l6 -30 M160 246 l-6 -30" stroke="#78350f" stroke-width="3"/><rect x="114" y="212" width="50" height="22" rx="4" fill="#14532d" stroke="#78350f" stroke-width="2.5"/><text x="139" y="227">${view.price || ''}</text></g>
<g class="sacks">${sacks}</g>${view.rise ? `<g class="tag"><rect x="262" y="202" width="36" height="13" rx="6.5"/><text x="280" y="211.5">+25%</text></g>` : ''}
${view.closed ? `<g class="shutter"><rect x="104" y="100" width="152" height="107" fill="#9ca3af" stroke="${OL}" stroke-width="1.4"/>${Array.from({ length: 10 }, (_, i) => `<path d="M104 ${110 + i * 10} H256" stroke="#6b7280" stroke-width="2"/>`).join('')}</g>` : ''}
<g class="queue">${people}</g>
${view.rain ? `<g class="drops">${Array.from({ length: 14 }, (_, i) => `<path d="M${12 + i * 25} ${60 + (i % 3) * 20} l-3 10" style="--i:${i % 5}"/>`).join('')}</g>` : ''}
<g id="fx">${moved}</g></g></svg>`;
}

// One finished week, day by day (1.1 s each). A day pill names the day; customers are
// served: mandazi go to the queue and coins pop into the tin (papers to the clipboard
// for credit). On sold-out days a stamp shows and a cross customer walks away;
// leftovers go to the bin. The tin moves from its start to its end amount.
export const DAY_MS = 1100;
export function animateWeek(host, result, labels) {
  const fx = host.querySelector('#fx');
  if (!fx) return 0;
  const parts = [];
  if (result.bought) parts.push(`<g class="fx arrive" style="--d:0"><path d="M268 238 q-3 -14 3 -16 l2 -3 l2 3 q6 2 3 16 z" fill="#f5f0e6" stroke="${OL}" stroke-width="1.2"/></g>`);
  if (result.flow.collected > 0) parts.push(coin(320, 180, 'collected', '--d:0'));
  const schoolCredit = result.invoices.some(x => x.who === 'school');
  result.days.forEach((day, d) => {
    const at = `--d:${d}`;
    parts.push(`<g class="fx daypill" style="${at}"><rect x="142" y="36" width="76" height="22" rx="11"/><text class="daylabel" x="180" y="51.5">${labels.day(d + 1)}</text></g>`);
    const cashPieces = day.stall + day.office + (schoolCredit ? 0 : day.school);
    for (let i = 0; i < cap(Math.ceil(cashPieces / 15), 4); i++) {
      parts.push(`<g class="fx give" style="${at};--i:${i}">${mandazi(186, 150)}</g>`);
      parts.push(coin(300 - i * 4, 186, 'coin', `${at};--i:${i}`));
    }
    if ((schoolCredit ? day.school : 0) + day.kiosk + day.neighbours) parts.push(`<rect class="fx invoice" x="316" y="176" width="12" height="15" rx="1" fill="#fff" stroke="#64748b" style="${at}"/>`);
    if (day.demand > day.stall) parts.push(`<g class="fx leave" style="${at}">${person(334, 226, { s: .78, mood: 'cross', cloth: '#64748b' })}<g transform="translate(346 176)"><circle r="8" fill="#fff" stroke="${OL}" stroke-width="1.2"/><text class="bang" y="4">!</text></g></g>`,
      `<g class="fx soldout" style="${at}"><rect x="146" y="128" width="78" height="20" rx="4" transform="rotate(-8 185 138)"/><text x="185" y="142.5" transform="rotate(-8 185 138)">${labels.soldOut}</text></g>`);
    if (day.waste) parts.push(`<g class="fx waste" style="${at}">${mandazi(186, 150)}</g>`);
    if (day.rain) parts.push(`<g class="fx drops" style="${at}"><path d="M40 70 v14 M100 60 v14 M160 74 v14 M220 60 v14 M280 74 v14 M330 60 v14"/></g>`);
  });
  fx.innerHTML = parts.join('');
  const fill = host.querySelector('.tin .fill');
  const set = cash => { fill.style.transform = `scaleY(${level(cash)})`; };
  set(result.cashStart);
  host.classList.remove('done'); host.classList.add('playing');
  requestAnimationFrame(() => requestAnimationFrame(() => set(result.cashEnd)));
  return result.days.length * DAY_MS + 500;
}

// Who or what an event is about, drawn for its card in the same style as the street.
// Pictures carry meaning for readers who skip text; the card text still states everything.
const PORTRAIT = {
  household: `<path d="M8 34 l24 -20 l24 20 v28 h-48 z" fill="#fde68a" stroke="${OL}" stroke-width="2"/><rect x="26" y="44" width="12" height="18" fill="#92400e" stroke="${OL}" stroke-width="1.5"/><path d="M4 36 l28 -24 l28 24" fill="none" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>`,
  shop: jiko(32, 60, ''),
  neema: person(32, 92, { s: 1.6, skin: SKIN[2], cloth: '#7c3aed', wrap: '#c4b5fd' }),
  people: person(16, 62, { s: .9, skin: SKIN[3], cloth: '#16a34a', cap: '#15803d' }) + person(48, 62, { s: .9, skin: SKIN[1], cloth: '#e11d48', wrap: '#fbbf24' }) + person(32, 66, { s: 1, skin: SKIN[0], cloth: '#0ea5e9' }),
  book: `<rect x="14" y="10" width="36" height="46" rx="3" fill="#1d4ed8" stroke="${OL}" stroke-width="2"/><path d="M22 22 h20 M22 30 h20 M22 38 h14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`,
  office: `<rect x="12" y="6" width="40" height="56" fill="#cbd5e1" stroke="${OL}" stroke-width="2"/><path d="M18 14 h9 v8 h-9 z M37 14 h9 v8 h-9 z M18 30 h9 v8 h-9 z M37 30 h9 v8 h-9 z" fill="#1e3a8a" opacity=".45"/><rect x="26" y="46" width="12" height="16" fill="#475569"/>`,
  school: `<path d="M6 28 l26 -18 l26 18 z" fill="#dc2626" stroke="${OL}" stroke-width="2"/><rect x="10" y="28" width="44" height="32" fill="#fef08a" stroke="${OL}" stroke-width="2"/><rect x="26" y="42" width="12" height="18" fill="#92400e"/>`,
  kiosk: `<rect x="12" y="22" width="40" height="38" fill="#bae6fd" stroke="${OL}" stroke-width="2"/><path d="M6 22 h52 l-4 10 h-44 z" fill="#0369a1" stroke="${OL}" stroke-width="2"/><rect x="18" y="38" width="6" height="14" fill="#16a34a"/><rect x="29" y="38" width="6" height="14" fill="#dc2626"/><rect x="40" y="38" width="6" height="14" fill="#eab308"/>`,
  rival: person(32, 92, { s: 1.6, skin: SKIN[3], cloth: '#dc2626', wrap: '#fbbf24', mood: 'cross' }),
  juma: person(32, 92, { s: 1.6, skin: SKIN[1], cloth: '#2563eb', cap: '#1e3a8a' }),
  travel: `<rect x="10" y="22" width="44" height="34" rx="5" fill="#b45309" stroke="${OL}" stroke-width="2"/><path d="M24 22 v-8 h16 v8" stroke="${OL}" stroke-width="3" fill="none"/><path d="M10 36 h44" stroke="#fde68a" stroke-width="3"/>`,
  bakari: person(32, 92, { s: 1.6, skin: SKIN[3], cloth: '#475569', cap: '#fff' }),
};
const EVENT_PORTRAIT = { payment: 'household', pot: 'shop', neema: 'neema', notebook: 'book', office: 'office', office2: 'office', officeResult: 'office',
  neighbours: 'people', school: 'school', schoolTrial: 'school', schoolCounter: 'school', discrepancy: 'school', competitor: 'rival', kiosk: 'kiosk',
  helper: 'juma', helperHire: 'juma', away: 'travel', away2: 'travel', flour: 'bakari' };
export const portrait = event => `<svg viewBox="0 0 64 68" aria-hidden="true">${PORTRAIT[EVENT_PORTRAIT[event]] || ''}</svg>`;
