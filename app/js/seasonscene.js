// The stall as one small SVG. Its parts are drawn from saved state only: pots, packs,
// trays, helper, customers, tin level, invoices and business buyers. A finished week
// replays as a short CSS animation of its saved day results; nothing here decides
// an outcome. Reduced motion or "skip" shows the final picture at once.
// With the previous picture (prev), parts that were added enter with a short motion and
// cash moved outside trading flies into or out of the tin, so every action is seen.
const W = 360;
const cap = (n, max) => Math.max(0, Math.min(max, n));
const person = (x, y, body, cls = '') =>
  `<g class="p ${cls}" transform="translate(${x} ${y})"><circle r="7" cy="-19" fill="#8a5a3b"/><rect x="-8" y="-12" width="16" height="20" rx="6" fill="${body}"/></g>`;

// Tin fill: 0..1 of a sample scale; the label, not the height, carries the amount.
export const level = cash => cap(cash / 40000, 1);

export function drawScene(view, prev = null) {
  const fresh = (i, before) => prev && i >= before ? ' new' : '';
  const trays = cap(view.trays, 15), packs = cap(Math.ceil(view.stock / 6), 6);
  const queue = cap(Math.round(view.queue / 9), 8), papers = cap(view.invoices, 6);
  const trayRects = Array.from({ length: trays }, (_, i) => {
    const x = 122 + (i % 5) * 20, y = 132 - Math.floor(i / 5) * 7;
    return `<g class="tray-g${fresh(i, prev?.trays)}"><rect class="tray" x="${x}" y="${y}" width="18" height="6" rx="2"/><circle cx="${x + 5}" cy="${y}" r="3" class="mz"/><circle cx="${x + 12}" cy="${y}" r="3" class="mz"/></g>`;
  }).join('');
  const pots = Array.from({ length: view.pots }, (_, i) => {
    const x = 34 + i * 26;
    return `<g class="pot${fresh(i, prev?.pots)}"><path class="steam" d="M${x + 8} 118 q-4 -8 0 -14 q4 -6 0 -12"/><rect x="${x}" y="122" width="18" height="16" rx="4"/><rect x="${x - 3}" y="119" width="24" height="4" rx="2"/></g>`;
  }).join('');
  const sacks = Array.from({ length: packs }, (_, i) =>
    `<path class="sack${fresh(i, prev && Math.ceil(prev.stock / 6))}" d="M${14 + i * 13} 170 q-2 -14 5 -16 q7 2 5 16 z"/>`).join('');
  const people = Array.from({ length: queue }, (_, i) =>
    person(262 + (i % 4) * 22, 172 - Math.floor(i / 4) * 4 + (i % 2) * 3, ['#0f766e', '#b45309', '#7c3aed', '#be123c'][i % 4], 'cust')).join('');
  const clip = Array.from({ length: papers }, (_, i) =>
    `<rect class="paper${fresh(i, prev?.invoices)}" x="${152 + i * 2}" y="${100 - i * 3}" width="12" height="15" rx="1"/>`).join('');
  const buildings = [
    view.office && `<g class="bld${prev && !prev.office ? ' new' : ''}"><rect x="252" y="30" width="44" height="62" fill="#cbd5e1"/><rect x="258" y="38" width="10" height="8" fill="#fff"/><rect x="278" y="38" width="10" height="8" fill="#fff"/><rect x="258" y="54" width="10" height="8" fill="#fff"/><rect x="278" y="54" width="10" height="8" fill="#fff"/></g>`,
    view.school && `<g class="bld${prev && !prev.school ? ' new' : ''}"><path d="M300 52 l26 -18 l26 18 z" fill="#b91c1c"/><rect x="304" y="52" width="44" height="40" fill="#fde68a"/><rect x="320" y="70" width="12" height="22" fill="#92400e"/></g>`,
    view.kiosk && `<g class="bld${prev && !prev.kiosk ? ' new' : ''}"><rect x="206" y="62" width="30" height="30" fill="#bae6fd"/><rect x="202" y="58" width="38" height="6" fill="#0369a1"/></g>`,
  ].filter(Boolean).join('');
  // Cash moved by a plan action (loan, pot, wage, collection): coins to or from the tin.
  const moved = prev && view.cash !== prev.cash ? Array.from({ length: 3 }, (_, i) =>
    `<circle class="fx ${view.cash > prev.cash ? 'cashin' : 'cashout'}" cx="${view.cash > prev.cash ? 120 : 234}" cy="${view.cash > prev.cash ? 60 : 120}" r="4" style="--i:${i}"/>`).join('') : '';
  // The top of the sky is cropped so the stall stays large on a small screen.
  return `<svg viewBox="0 28 ${W} 172" xmlns="http://www.w3.org/2000/svg" class="${view.rain ? 'rain' : ''}">
<rect width="${W}" height="200" fill="#ffe8c4"/><circle cx="36" cy="30" r="14" fill="#fbbf24"/>
${buildings}
<rect y="150" width="${W}" height="50" fill="#e7cfa6"/><rect y="178" width="${W}" height="6" fill="#d6b98c"/>
<g class="sacks">${sacks}</g>${view.rise ? '<g class="tag"><rect x="12" y="140" width="40" height="12" rx="3"/><text x="32" y="149">+25%</text></g>' : ''}
${pots}${view.helper ? person(60, 150, '#2563eb', `juma${prev && !prev.helper ? ' new' : ''}`) : ''}
<rect x="110" y="104" width="140" height="46" rx="4" fill="#fff7ea" stroke="#c9a47a"/>
<path d="M104 90 h152 l-8 16 h-136 z" class="awning"/><path d="M122 90 l-4 16 M146 90 l-2 16 M170 90 v16 M194 90 l2 16 M218 90 l4 16 M242 90 l6 16" stroke="#fff" stroke-width="5" opacity=".7"/>
${view.owner ? person(190, 104, '#ea580c', 'owner') : ''}
<g class="trays">${trayRects}</g>
<g class="price${prev && prev.price !== view.price ? ' new' : ''}"><rect x="112" y="140" width="46" height="9" rx="2"/><text x="135" y="147.5">${view.price || ''}</text></g>
${view.notebook ? `<g class="book${prev && !prev.notebook ? ' new' : ''}"><rect x="124" y="104" width="14" height="10" rx="1"/><path d="M131 104 v10"/></g>` : ''}
<g class="clip"><rect x="148" y="96" width="22" height="26" rx="2" fill="#92400e"/>${clip}</g>
<g class="tin"><rect x="222" y="112" width="24" height="30" rx="3" fill="#374151"/><rect class="fill" x="225" y="113" width="18" height="26" fill="#facc15" style="transform:scaleY(${level(prev ? prev.cash : view.cash)})"/></g>
<g class="bin"><rect x="254" y="136" width="14" height="14" rx="2" fill="#6b7280"/></g>
${view.closed ? '<rect x="110" y="104" width="140" height="46" fill="#1f2937" opacity=".75"/>' : ''}
<g class="queue">${people}</g><g id="fx">${moved}</g></svg>`;
}

// One finished week, day by day. Coins fly to the tin for cash sales, a paper flies to
// the clipboard for sales on credit, customers leave on sold-out days and leftovers go
// to the bin. Each day takes .5 s; the tin moves from its start to its end amount.
export function animateWeek(host, result, labels) {
  const fx = host.querySelector('#fx');
  if (!fx) return 0;
  const parts = [];
  if (result.bought) parts.push('<g class="fx arrive" style="--d:0"><path class="sack" d="M14 170 q-2 -14 5 -16 q7 2 5 16 z"/></g>');
  if (result.flow.collected > 0) parts.push('<circle class="fx collected" cx="170" cy="105" r="4" style="--d:0"/>');
  const schoolCredit = result.invoices.some(x => x.who === 'school');
  result.days.forEach((day, d) => {
    const delay = `style="--d:${d}"`;
    parts.push(`<text class="fx daylabel" x="180" y="44" ${delay}>${labels.day(d + 1)}</text>`);
    const cashPieces = day.stall + day.office + (schoolCredit ? 0 : day.school);
    for (let i = 0; i < cap(Math.ceil(cashPieces / 15), 4); i++)
      parts.push(`<circle class="fx coin" cx="${270 + i * 14}" cy="150" r="4" style="--d:${d};--i:${i}"/>`);
    if ((schoolCredit ? day.school : 0) + day.kiosk + day.neighbours) parts.push(`<rect class="fx invoice" x="300" y="120" width="12" height="15" ${delay}/>`);
    if (day.demand > day.stall) parts.push(`<g class="fx leave" ${delay}>${person(330, 172, '#64748b')}</g><text class="fx soldout" x="300" y="112" ${delay}>${labels.soldOut}</text>`);
    if (day.waste) parts.push(`<circle class="fx waste" cx="200" cy="130" r="3" ${delay}/>`);
    if (day.rain) parts.push(`<g class="fx drops" ${delay}><path d="M40 40 v12 M100 30 v12 M160 44 v12 M220 30 v12 M280 44 v12 M330 30 v12"/></g>`);
  });
  fx.innerHTML = parts.join('');
  const fill = host.querySelector('.tin .fill');
  const set = cash => { fill.style.transform = `scaleY(${level(cash)})`; };
  set(result.cashStart);
  host.classList.remove('done'); host.classList.add('playing');
  requestAnimationFrame(() => requestAnimationFrame(() => set(result.cashEnd)));
  return result.days.length * 500 + 400;
}

// Who or what an event is about, drawn small for its card. Pictures carry meaning for
// readers who skip text; the card text still states everything.
const face = (body, extra = '') => `<circle cx="32" cy="22" r="11" fill="#8a5a3b"/><rect x="18" y="35" width="28" height="26" rx="10" fill="${body}"/>${extra}`;
const PORTRAIT = {
  household: '<path d="M10 30 l22 -18 l22 18 v26 h-44 z" fill="#fde68a" stroke="#92400e" stroke-width="2"/><rect x="27" y="40" width="10" height="16" fill="#92400e"/>',
  shop: '<rect x="18" y="34" width="28" height="20" rx="5" fill="#475569"/><rect x="14" y="30" width="36" height="6" rx="3" fill="#475569"/><path d="M26 26 q-4 -8 0 -14 M38 26 q4 -8 0 -14" stroke="#94a3b8" stroke-width="2" fill="none"/>',
  neema: face('#7c3aed', '<path d="M20 18 q12 -14 24 0 v-4 q-12 -10 -24 0 z" fill="#c4b5fd"/>'),
  people: face('#b45309') + '<g transform="translate(-16 6) scale(.8)">' + face('#0f766e') + '</g><g transform="translate(28 6) scale(.8)">' + face('#be123c') + '</g>',
  book: '<rect x="14" y="12" width="36" height="42" rx="3" fill="#1d4ed8"/><path d="M22 22 h20 M22 30 h20 M22 38 h14" stroke="#fff" stroke-width="2"/>',
  office: '<rect x="14" y="8" width="36" height="50" fill="#cbd5e1"/><path d="M20 16 h8 v6 h-8 z M36 16 h8 v6 h-8 z M20 30 h8 v6 h-8 z M36 30 h8 v6 h-8 z" fill="#fff"/>',
  school: '<path d="M8 26 l24 -16 l24 16 z" fill="#b91c1c"/><rect x="12" y="26" width="40" height="30" fill="#fde68a"/><rect x="27" y="40" width="10" height="16" fill="#92400e"/>',
  kiosk: '<rect x="14" y="24" width="36" height="32" fill="#bae6fd"/><rect x="10" y="18" width="44" height="8" fill="#0369a1"/>',
  rival: face('#dc2626', '<path d="M22 14 h20 l-4 -6 h-12 z" fill="#fbbf24"/>'),
  juma: face('#2563eb'),
  travel: '<rect x="12" y="22" width="40" height="30" rx="4" fill="#92400e"/><path d="M24 22 v-6 h16 v6" stroke="#92400e" stroke-width="3" fill="none"/>',
  bakari: face('#475569', '<path d="M21 16 q11 -10 22 0 z" fill="#fff"/><path d="M26 30 q6 4 12 0" stroke="#e5e7eb" stroke-width="3" fill="none"/>'),
};
const EVENT_PORTRAIT = { payment: 'household', pot: 'shop', neema: 'neema', notebook: 'book', office: 'office', office2: 'office', officeResult: 'office',
  neighbours: 'people', school: 'school', schoolTrial: 'school', schoolCounter: 'school', discrepancy: 'school', competitor: 'rival', kiosk: 'kiosk',
  helper: 'juma', helperHire: 'juma', away: 'travel', away2: 'travel', flour: 'bakari' };
export const portrait = event => `<svg viewBox="0 0 64 64" aria-hidden="true">${PORTRAIT[EVENT_PORTRAIT[event]] || ''}</svg>`;
