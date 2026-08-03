// scene.js — generated SVG illustrations and small animation helpers.
// No dependencies. No network. No innerHTML with user data.
// All drawing is document.createElementNS so nothing here needs a build step.

const NS = 'http://www.w3.org/2000/svg';
const REDUCE = typeof matchMedia === 'function'
  ? matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

function svg(name, attrs) {
  const node = document.createElementNS(NS, name);
  if (attrs) {
    for (const key in attrs) node.setAttribute(key, attrs[key]);
  }
  return node;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ---- shared scene primitives --------------------------------------------

const VB_W = 320;
const VB_H = 160;
const GROUND_Y = 132;

function baseSvg(extraClass) {
  const root = svg('svg', {
    viewBox: `0 0 ${VB_W} ${VB_H}`,
    class: 'scene-svg' + (extraClass ? ' ' + extraClass : ''),
    role: 'img',
    'aria-hidden': 'true',
    preserveAspectRatio: 'xMidYMax meet',
  });
  return root;
}

function skyGround(root, night) {
  root.appendChild(svg('rect', {
    x: 0, y: 0, width: VB_W, height: GROUND_Y,
    class: night ? 'scene-sky scene-sky-night' : 'scene-sky',
  }));
  root.appendChild(svg('rect', {
    x: 0, y: GROUND_Y, width: VB_W, height: VB_H - GROUND_Y,
    class: night ? 'scene-ground scene-ground-night' : 'scene-ground',
  }));
}

function sun(root, cx, cy, r) {
  root.appendChild(svg('circle', { cx, cy, r, class: 'scene-sun' }));
}

function moonAndStars(root, count) {
  root.appendChild(svg('circle', { cx: 262, cy: 30, r: 16, class: 'scene-moon' }));
  const positions = [
    [24, 20], [60, 42], [110, 18], [150, 34], [190, 16],
    [220, 46], [30, 58], [130, 52], [95, 34], [200, 62],
  ];
  const n = clamp(count, 3, positions.length);
  for (let i = 0; i < n; i++) {
    const [x, y] = positions[i];
    root.appendChild(svg('circle', { cx: x, cy: y, r: 1.4, class: 'scene-star' }));
  }
}

function cloud(root, x, y, scale) {
  const g = svg('g', { class: 'scene-cloud', transform: `translate(${x} ${y}) scale(${scale})` });
  g.appendChild(svg('ellipse', { cx: 0, cy: 0, rx: 14, ry: 8 }));
  g.appendChild(svg('ellipse', { cx: 12, cy: -3, rx: 10, ry: 7 }));
  g.appendChild(svg('ellipse', { cx: -12, cy: 2, rx: 9, ry: 6 }));
  root.appendChild(g);
}

// A simple flat figure: head + body, feet at (x, groundY).
function figure(root, x, groundY, opts) {
  opts = opts || {};
  const scale = opts.scale || 1;
  const cls = 'scene-figure' + (opts.staff ? ' scene-figure-staff' : ' scene-figure-customer');
  const g = svg('g', { class: cls, transform: `translate(${x} ${groundY})` });
  const bodyH = 20 * scale;
  const bodyW = 11 * scale;
  g.appendChild(svg('rect', {
    x: -bodyW / 2, y: -bodyH, width: bodyW, height: bodyH, rx: bodyW / 2.2,
    class: 'scene-figure-body',
  }));
  g.appendChild(svg('circle', { cx: 0, cy: -bodyH - 5 * scale, r: 5 * scale, class: 'scene-figure-head' }));
  if (opts.staff) {
    // small apron / cap mark so staff read as distinct without relying on colour alone
    g.appendChild(svg('rect', {
      x: -bodyW / 2, y: -bodyH * 0.55, width: bodyW, height: bodyH * 0.45,
      class: 'scene-figure-apron',
    }));
    g.appendChild(svg('rect', {
      x: -4 * scale, y: -bodyH - 9 * scale, width: 8 * scale, height: 3 * scale,
      class: 'scene-figure-cap',
    }));
  }
  if (opts.idle) g.setAttribute('class', g.getAttribute('class') + ' scene-figure-idle');
  root.appendChild(g);
  return g;
}

function customerRow(root, count, groundY, spanX) {
  count = clamp(count, 0, 8);
  if (count === 0) return;
  const startX = (VB_W - spanX) / 2 + 10;
  const step = count > 1 ? spanX / (count - 1 || 1) : 0;
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? VB_W / 2 : startX + step * i;
    figure(root, x, groundY, { scale: 0.8 + (i % 2) * 0.06, idle: i % 3 === 0 });
  }
}

function staffRow(root, count, groundY, cx) {
  count = clamp(count, 0, 4);
  const spacing = 16;
  const start = cx - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    figure(root, start + i * spacing, groundY, { scale: 0.85, staff: true });
  }
}

// A stall / kiosk whose footprint grows with capacity.
function stall(root, cx, baseY, scale, opts) {
  opts = opts || {};
  const w = 76 * scale;
  const h = 46 * scale;
  const g = svg('g', { class: 'scene-stall', transform: `translate(${cx} ${baseY})` });

  // roof
  g.appendChild(svg('polygon', {
    points: `${-w / 2 - 8},${-h} ${w / 2 + 8},${-h} ${w / 2 - 2},${-h - 16} ${-w / 2 + 2},${-h - 16}`,
    class: 'scene-stall-roof',
  }));
  // awning stripes (shape-based, not colour-only)
  const stripeCount = 5;
  const stripeW = (w + 16) / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    g.appendChild(svg('rect', {
      x: -w / 2 - 8 + i * stripeW, y: -h - 16, width: stripeW, height: 5,
      class: i % 2 === 0 ? 'scene-stall-awning-a' : 'scene-stall-awning-b',
    }));
  }
  // wall
  g.appendChild(svg('rect', { x: -w / 2, y: -h, width: w, height: h, class: 'scene-stall-wall' }));
  // counter
  g.appendChild(svg('rect', {
    x: -w / 2 - 4, y: -h * 0.42, width: w + 8, height: h * 0.42,
    class: 'scene-stall-counter',
  }));
  // goods on counter — count nods to capacity
  const goods = clamp(Math.round(scale * 4), 1, 7);
  for (let i = 0; i < goods; i++) {
    g.appendChild(svg('circle', {
      cx: -w / 2 + 8 + i * ((w - 16) / Math.max(1, goods - 1 || 1)),
      cy: -h * 0.42 - 3, r: 3, class: 'scene-stall-goods',
    }));
  }
  if (opts.pot) {
    const potX = 0, potY = -h - 4;
    g.appendChild(svg('ellipse', { cx: potX, cy: potY, rx: 9, ry: 5, class: 'scene-pot' }));
    const steam = svg('path', {
      d: `M ${potX - 3} ${potY - 4} q 3 -8 0 -14 q -3 6 0 -12`,
      class: 'scene-steam',
    });
    g.appendChild(steam);
  }
  if (opts.closed) {
    g.appendChild(svg('rect', {
      x: -w / 2, y: -h * 0.42, width: w, height: h * 0.42, class: 'scene-stall-shutter',
    }));
  }
  root.appendChild(g);
  return { w, h };
}

function dimOverlay(root, amount) {
  if (amount <= 0) return;
  root.appendChild(svg('rect', {
    x: 0, y: 0, width: VB_W, height: VB_H,
    class: 'scene-dim-overlay', 'fill-opacity': clamp(amount, 0, 0.55),
  }));
}

function grimeOrSparkle(root, hygiene, cx, cy) {
  if (hygiene < 40) {
    const specks = [[-14, 4], [10, 8], [2, -4], [-6, 10]];
    specks.forEach(([dx, dy]) => {
      root.appendChild(svg('circle', {
        cx: cx + dx, cy: cy + dy, r: 1.6, class: 'scene-grime',
      }));
    });
  } else if (hygiene >= 70) {
    const sparks = [[-16, -2], [14, 2], [0, -10]];
    sparks.forEach(([dx, dy]) => {
      const s = svg('path', {
        d: `M ${cx + dx} ${cy + dy - 4} L ${cx + dx} ${cy + dy + 4} M ${cx + dx - 4} ${cy + dy} L ${cx + dx + 4} ${cy + dy}`,
        class: 'scene-sparkle',
      });
      root.appendChild(s);
    });
  }
}

function formalityBadges(root, level, x, y) {
  const n = clamp(level, 0, 3);
  for (let i = 0; i < 3; i++) {
    const cx = x + i * 16;
    root.appendChild(svg('circle', {
      cx, cy: y, r: 6,
      class: 'scene-badge' + (i < n ? ' scene-badge-earned' : ' scene-badge-empty'),
    }));
    if (i < n) {
      root.appendChild(svg('path', {
        d: `M ${cx - 3} ${y} l 2 2.5 l 4 -5`,
        class: 'scene-badge-check',
      }));
    }
  }
}

function cashStack(root, cx, baseY, cash) {
  const coins = clamp(Math.round((cash || 0) / 60000), 1, 6);
  for (let i = 0; i < coins; i++) {
    root.appendChild(svg('ellipse', {
      cx, cy: baseY - i * 4, rx: 10, ry: 3.4, class: 'scene-coin',
    }));
  }
}

// ---- scene builders --------------------------------------------------

function deriveCustomerCount(state) {
  const demand = state.demand == null ? 100 : state.demand;
  return clamp(Math.round(demand / 40), 0, 7);
}

function deriveScale(state) {
  const capacity = state.capacity == null ? 180 : state.capacity;
  return clamp(capacity / 180, 0.65, 1.7);
}

function buildStallScene(root, state, mode) {
  const day = mode !== 'night';
  skyGround(root, false);
  cloud(root, 60, 26, 1);
  cloud(root, 230, 20, 0.7);
  sun(root, 40, 26, 15);

  const scale = deriveScale(state);
  let count = deriveCustomerCount(state);
  if (mode === 'empty') count = Math.min(count, 1);
  if (mode === 'busy') count = Math.max(count, 4);

  const { h } = stall(root, VB_W / 2, GROUND_Y, scale, { pot: true, closed: mode === 'empty' && (state.reputation ?? 50) < 20 });
  customerRow(root, count, GROUND_Y, 220);
  staffRow(root, state.staff || 0, GROUND_Y, VB_W / 2 - 40);
  grimeOrSparkle(root, state.hygiene == null ? 60 : state.hygiene, VB_W / 2, GROUND_Y - h - 20);

  const reputation = state.reputation == null ? 50 : state.reputation;
  if (reputation < 35) dimOverlay(root, (35 - reputation) / 60);
}

function buildKitchenScene(root, state) {
  skyGround(root, false);
  // back wall + shelf
  root.appendChild(svg('rect', { x: 0, y: 20, width: VB_W, height: GROUND_Y - 20, class: 'scene-kitchen-wall' }));
  root.appendChild(svg('rect', { x: 20, y: 34, width: 90, height: 8, class: 'scene-shelf' }));
  const jars = clamp(Math.round(deriveScale(state) * 4), 1, 6);
  for (let i = 0; i < jars; i++) {
    root.appendChild(svg('rect', {
      x: 26 + i * 14, y: 20, width: 9, height: 13, rx: 2, class: 'scene-jar',
    }));
  }
  // stove + pot
  const scale = deriveScale(state);
  root.appendChild(svg('rect', {
    x: VB_W / 2 - 22 * scale, y: GROUND_Y - 20, width: 44 * scale, height: 20, class: 'scene-stove',
  }));
  root.appendChild(svg('ellipse', {
    cx: VB_W / 2, cy: GROUND_Y - 22, rx: 20 * scale, ry: 8, class: 'scene-pot',
  }));
  root.appendChild(svg('path', {
    d: `M ${VB_W / 2 - 4} ${GROUND_Y - 30} q 4 -10 0 -18 q -4 6 0 -14`,
    class: 'scene-steam',
  }));
  // prep table
  root.appendChild(svg('rect', { x: 210, y: GROUND_Y - 14, width: 70, height: 8, class: 'scene-table' }));

  staffRow(root, Math.max(state.staff || 0, 1), GROUND_Y, VB_W / 2 - 8);
  grimeOrSparkle(root, state.hygiene == null ? 60 : state.hygiene, 60, 60);
  const reputation = state.reputation == null ? 50 : state.reputation;
  if (reputation < 35) dimOverlay(root, (35 - reputation) / 60);
}

function buildMarketScene(root, state) {
  skyGround(root, false);
  sun(root, 292, 20, 12);
  const scale = deriveScale(state) * 0.7;
  // two generic competitor stalls, smaller and duller, then the learner's own stall
  stall(root, 66, GROUND_Y, 0.6, {});
  stall(root, 254, GROUND_Y, 0.6, {});
  stall(root, VB_W / 2, GROUND_Y, clamp(scale + 0.3, 0.6, 1.4), { pot: true });

  const count = Math.max(deriveCustomerCount(state), 3);
  customerRow(root, count, GROUND_Y, 260);
  staffRow(root, state.staff || 0, GROUND_Y, VB_W / 2);
}

function buildOfficeScene(root, state) {
  skyGround(root, false);
  root.appendChild(svg('rect', { x: 0, y: 10, width: VB_W, height: GROUND_Y - 10, class: 'scene-office-wall' }));
  root.appendChild(svg('rect', { x: 30, y: GROUND_Y - 46, width: 200, height: 30, class: 'scene-desk' }));
  root.appendChild(svg('rect', { x: 30, y: GROUND_Y - 16, width: 200, height: 16, class: 'scene-desk-front' }));

  const neat = !!state.keepsRecords;
  if (neat) {
    for (let i = 0; i < 3; i++) {
      root.appendChild(svg('rect', {
        x: 60 + i * 16, y: GROUND_Y - 58 - i * 2, width: 12, height: 16, class: 'scene-ledger-neat',
      }));
    }
  } else {
    const scatter = [[70, -50, -8], [90, -46, 10], [110, -52, -4]];
    scatter.forEach(([x, y, r]) => {
      root.appendChild(svg('rect', {
        x, y: GROUND_Y + y, width: 12, height: 16,
        transform: `rotate(${r} ${x + 6} ${GROUND_Y + y + 8})`,
        class: 'scene-ledger-scatter',
      }));
    });
  }
  formalityBadges(root, state.formality || 0, 150, GROUND_Y - 60);
  figure(root, 180, GROUND_Y, { scale: 0.9 });
  staffRow(root, Math.max((state.staff || 0) - 1, 0), GROUND_Y, 220);
}

function buildTruckScene(root, state) {
  skyGround(root, false);
  sun(root, 40, 24, 14);
  root.appendChild(svg('rect', { x: 0, y: GROUND_Y - 2, width: VB_W, height: 4, class: 'scene-road' }));
  const dashes = 6;
  for (let i = 0; i < dashes; i++) {
    root.appendChild(svg('rect', {
      x: i * 56, y: GROUND_Y - 1, width: 24, height: 2, class: 'scene-road-dash',
    }));
  }
  const scale = deriveScale(state);
  const g = svg('g', { class: 'scene-truck', transform: `translate(120 ${GROUND_Y - 4})` });
  g.appendChild(svg('rect', { x: 0, y: -30 * scale, width: 70 * scale, height: 30 * scale, class: 'scene-truck-bed' }));
  g.appendChild(svg('rect', { x: 70 * scale, y: -20 * scale, width: 26 * scale, height: 20 * scale, class: 'scene-truck-cab' }));
  g.appendChild(svg('circle', { cx: 14 * scale, cy: 0, r: 6 * scale, class: 'scene-truck-wheel' }));
  g.appendChild(svg('circle', { cx: 84 * scale, cy: 0, r: 6 * scale, class: 'scene-truck-wheel' }));

  const capacity = state.capacity == null ? 180 : state.capacity;
  const demand = state.demand == null ? 100 : state.demand;
  const surplus = capacity > demand;
  const boxCount = clamp(Math.round(capacity / 40), 1, 6);
  for (let i = 0; i < boxCount; i++) {
    g.appendChild(svg('rect', {
      x: 6 * scale + (i % 3) * 20 * scale,
      y: -30 * scale - Math.floor(i / 3) * 16 * scale,
      width: 16 * scale, height: 14 * scale,
      class: surplus ? 'scene-box scene-box-surplus' : 'scene-box',
    }));
  }
  root.appendChild(g);
  figure(root, 220, GROUND_Y, { scale: 0.9, staff: (state.staff || 0) > 0 });
}

function buildInspectionScene(root, state) {
  skyGround(root, false);
  const scale = deriveScale(state);
  stall(root, VB_W / 2 - 40, GROUND_Y, scale, {});
  const hygiene = state.hygiene == null ? 60 : state.hygiene;
  grimeOrSparkle(root, hygiene, VB_W / 2 - 40, GROUND_Y - 60);

  // inspector figure with a clipboard
  const g = svg('g', { class: 'scene-figure scene-inspector', transform: `translate(220 ${GROUND_Y})` });
  g.appendChild(svg('rect', { x: -5.5, y: -20, width: 11, height: 20, rx: 5, class: 'scene-figure-body' }));
  g.appendChild(svg('circle', { cx: 0, cy: -25, r: 5, class: 'scene-figure-head' }));
  g.appendChild(svg('rect', { x: 6, y: -18, width: 9, height: 12, class: 'scene-clipboard' }));
  root.appendChild(g);

  const pass = hygiene >= 50;
  const badgeX = 262, badgeY = GROUND_Y - 40;
  root.appendChild(svg('circle', {
    cx: badgeX, cy: badgeY, r: 12,
    class: pass ? 'scene-verdict scene-verdict-pass' : 'scene-verdict scene-verdict-fail',
  }));
  if (pass) {
    root.appendChild(svg('path', {
      d: `M ${badgeX - 5} ${badgeY} l 3 4 l 7 -9`, class: 'scene-verdict-mark',
    }));
  } else {
    root.appendChild(svg('path', {
      d: `M ${badgeX - 5} ${badgeY - 5} l 10 10 M ${badgeX + 5} ${badgeY - 5} l -10 10`,
      class: 'scene-verdict-mark',
    }));
  }
}

function buildNightScene(root, state) {
  skyGround(root, true);
  moonAndStars(root, 6);
  const scale = deriveScale(state);
  stall(root, VB_W / 2 + 40, GROUND_Y, scale, { closed: true });

  // owner counting the day's cash by lamplight
  root.appendChild(svg('circle', { cx: 90, cy: GROUND_Y - 40, r: 18, class: 'scene-lamp-glow' }));
  figure(root, 90, GROUND_Y, { scale: 0.9 });
  cashStack(root, 108, GROUND_Y - 4, state.cash);
}

const SCENES = {
  'stall-small': (root, state) => buildStallScene(root, state, 'small'),
  'stall-busy': (root, state) => buildStallScene(root, state, 'busy'),
  'stall-empty': (root, state) => buildStallScene(root, state, 'empty'),
  kitchen: buildKitchenScene,
  market: buildMarketScene,
  office: buildOfficeScene,
  truck: buildTruckScene,
  inspection: buildInspectionScene,
  night: buildNightScene,
};

/**
 * Render an illustrative SVG scene into `el`, reflecting `state`.
 * @param {HTMLElement} el
 * @param {string} sceneName
 * @param {object} state
 */
export function drawScene(el, sceneName, state) {
  if (!el) return;
  clear(el);
  const s = state || {};
  const build = SCENES[sceneName] || SCENES['stall-small'];
  const root = baseSvg(REDUCE.matches ? 'scene-svg-static' : '');
  build(root, s);
  el.appendChild(root);
}

// ---- chart -------------------------------------------------------------

/**
 * Draw a small profit-over-time chart. history: [{week, profit, cash}]
 * @param {HTMLElement} el
 * @param {Array<{week:number, profit:number, cash:number}>} history
 */
export function drawChart(el, history) {
  if (!el) return;
  clear(el);
  const data = Array.isArray(history) ? history.slice(-12) : [];
  const w = 300, h = 120, padL = 8, padR = 8, padT = 10, padB = 18;
  const root = svg('svg', {
    viewBox: `0 0 ${w} ${h}`, class: 'chart-svg', role: 'img', 'aria-hidden': 'true',
  });

  if (data.length === 0) {
    root.appendChild(svg('text', { x: w / 2, y: h / 2, class: 'chart-empty' }));
    el.appendChild(root);
    return;
  }

  const profits = data.map((d) => d.profit || 0);
  const maxAbs = Math.max(1, ...profits.map(Math.abs));
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const zeroY = padT + plotH / 2;
  const barW = Math.min(20, plotW / data.length - 4);
  const step = plotW / data.length;

  // pattern for negative bars so the meaning isn't colour-only
  const defs = svg('defs', {});
  const pattern = svg('pattern', {
    id: 'chartNegHatch', width: 4, height: 4, patternTransform: 'rotate(45)', patternUnits: 'userSpaceOnUse',
  });
  pattern.appendChild(svg('rect', { width: 4, height: 4, class: 'chart-hatch-bg' }));
  pattern.appendChild(svg('line', { x1: 0, y1: 0, x2: 0, y2: 4, class: 'chart-hatch-line' }));
  defs.appendChild(pattern);
  root.appendChild(defs);

  root.appendChild(svg('line', {
    x1: padL, y1: zeroY, x2: w - padR, y2: zeroY, class: 'chart-baseline',
  }));

  data.forEach((d, i) => {
    const profit = d.profit || 0;
    const barH = (Math.abs(profit) / maxAbs) * (plotH / 2);
    const x = padL + step * i + (step - barW) / 2;
    const y = profit >= 0 ? zeroY - barH : zeroY;
    const bar = svg('rect', {
      x, y, width: barW, height: Math.max(1, barH),
      class: profit >= 0 ? 'chart-bar chart-bar-pos' : 'chart-bar chart-bar-neg',
    });
    bar.appendChild(svg('title', {})).textContent = String(d.week != null ? d.week : i + 1);
    root.appendChild(bar);
    root.appendChild(svg('text', {
      x: x + barW / 2, y: h - 4, class: 'chart-tick',
    })).textContent = String(d.week != null ? d.week : i + 1);
  });

  // cash trend as a line so it reads as a distinct series by shape, not colour
  const cashVals = data.map((d) => d.cash || 0);
  const cMin = Math.min(...cashVals), cMax = Math.max(...cashVals, cMin + 1);
  const points = data.map((d, i) => {
    const x = padL + step * i + step / 2;
    const norm = (((d.cash || 0) - cMin) / (cMax - cMin || 1));
    const y = padT + (1 - norm) * plotH;
    return `${x},${y}`;
  }).join(' ');
  root.appendChild(svg('polyline', { points, class: 'chart-cash-line' }));
  data.forEach((d, i) => {
    const x = padL + step * i + step / 2;
    const norm = (((d.cash || 0) - cMin) / (cMax - cMin || 1));
    const y = padT + (1 - norm) * plotH;
    root.appendChild(svg('circle', { cx: x, cy: y, r: 2, class: 'chart-cash-dot' }));
  });

  el.appendChild(root);
}

// ---- number animation ---------------------------------------------------

/**
 * Animate the text content of `el` from `from` to `to`.
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 * @param {{duration?:number, format?:(n:number)=>string}} [opts]
 */
export function animateNumber(el, from, to, opts) {
  if (!el) return;
  const options = opts || {};
  const format = typeof options.format === 'function' ? options.format : (n) => String(Math.round(n));
  const duration = REDUCE.matches ? 0 : Math.max(0, options.duration == null ? 500 : options.duration);

  if (duration === 0 || from === to) {
    el.textContent = format(to);
    return;
  }

  const start = performance.now();
  const startVal = Number(from) || 0;
  const endVal = Number(to) || 0;

  function tick(now) {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out
    const value = startVal + (endVal - startVal) * eased;
    el.textContent = format(value);
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = format(endVal);
    }
  }
  requestAnimationFrame(tick);
}

// ---- pulse ---------------------------------------------------------------

/**
 * Give `el` a brief attention animation (e.g. after a value changes).
 * @param {HTMLElement} el
 */
export function pulse(el) {
  if (!el) return;
  el.classList.remove('is-pulsing');
  // force reflow so the animation can restart if already applied
  // eslint-disable-next-line no-unused-expressions
  el.offsetWidth;
  el.classList.add('is-pulsing');
  const done = () => {
    el.classList.remove('is-pulsing');
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
  // fallback in case the animation is disabled (reduced motion) and never fires
  setTimeout(done, 700);
}
