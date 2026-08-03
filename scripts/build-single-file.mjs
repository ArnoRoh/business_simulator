// Builds a single self-contained HTML page from app/.
//
// Purpose: a shareable version that needs no web server and no checkout. The app
// normally fetches its scenario JSON, which requires a server; here the content is
// embedded directly.
//
// The ES modules are wrapped one-per-IIFE rather than flat-concatenated, because
// several modules declare same-named private helpers (scene.js and ui.js both have a
// `clear`) and flattening them would collide.
//
// Run: node scripts/build-single-file.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// Module order matters: dependencies first.
const MODULES = [
  ['format', 'app/js/format.js', ''],
  ['engine', 'app/js/engine.js', ''],
  ['record', 'app/js/record.js', ''],
  ['storage', 'app/js/storage.js', ''],
  ['scene', 'app/js/scene.js', ''],
  ['ui', 'app/js/ui.js', `
    const { money, moneyShort, count, proportion } = NS_format;
    const { weeklyPnl, ownerLoad } = NS_engine;
    const { drawScene, drawChart, animateNumber, pulse } = NS_scene;
  `],
  ['main', 'app/js/main.js', `
    const record = NS_record, store = NS_storage, ui = NS_ui;
    const { createState, applyEffects, weeklyPnl, advanceWeek } = NS_engine;
    const { setLocale } = NS_format;
  `],
];

/** Collect the names a module exports, so the IIFE can return them. */
function exportedNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  return [...names];
}

function wrapModule(name, src, injected) {
  const names = exportedNames(src);
  const body = src
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*$/gm, '')   // drop import statements
    .replace(/^export\s+/gm, '');                                  // keep declarations, drop keyword
  return `
/* ---- ${name} ---- */
const NS_${name} = (function () {
${injected}
${body}
  return { ${names.join(', ')} };
})();`;
}

const scenario = read('app/content/scenario-mama-asha.json');
const css = read('app/css/styles.css');

let js = MODULES.map(([name, path, injected]) => wrapModule(name, read(path), injected)).join('\n');

// Replace the network fetch with the embedded scenario, and make startup work whether
// or not DOMContentLoaded has already fired (it usually has, in an embedded page).
// Must consume the catch block too — matching only as far as the end of `try`
// leaves the original `catch` dangling and the script fails to parse.
const before = js;
js = js.replace(
  /let res;\s*try \{[\s\S]*?\} catch \(err\) \{[\s\S]*?\n  \}/,
  '  scenario = EMBEDDED_SCENARIO;',
);
if (js === before) throw new Error('scenario-fetch block not found — did main.js change?');
js = js.replace(
  "document.addEventListener('DOMContentLoaded', init);",
  `if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();`,
);

// Extract the markup between <body> and </body> from the real index.html, so the two
// stay in step rather than being maintained twice.
const html = read('app/index.html');
const bodyInner = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim()
  .replace(/\s*<script type="module"[\s\S]*?<\/script>/, '');

// The host page supplies <head>, so the viewport meta from index.html is lost.
// Without it a phone lays out at ~980px and scales down, which defeats the entire
// mobile-first design. Add it if the host has not.
const viewportShim = `<script>
(function () {
  if (!document.querySelector('meta[name="viewport"]')) {
    var m = document.createElement('meta');
    m.name = 'viewport';
    m.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    document.head.appendChild(m);
  }
})();
<\/script>`;

const out = `<title>Business Simulator — Mama Asha's Food Stall</title>
${viewportShim}
<style>
${css}
</style>

${bodyInner}

<script>
(function () {
  'use strict';
  const EMBEDDED_SCENARIO = ${scenario.trim()};
${js}
})();
</script>
`;

const dest = new URL('../app/standalone.html', import.meta.url);
writeFileSync(dest, out);
console.log(`wrote ${dest.pathname}  (${(out.length / 1024).toFixed(1)} KB)`);
