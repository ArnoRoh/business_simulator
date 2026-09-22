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

const entry = process.argv.includes('--entry');

// Module order matters: dependencies first.
const MODULES = entry ? [
  ['i18n', 'app/js/i18n.js'], ['format', 'app/js/format.js'],
  ['entrymodel', 'app/js/entrymodel.js'], ['entry', 'app/js/entry.js'],
] : [
  ['i18n', 'app/js/i18n.js'],
  ['format', 'app/js/format.js'],
  ['engine', 'app/js/engine.js'],
  ['record', 'app/js/record.js'],
  ['storage', 'app/js/storage.js'],
  ['scene', 'app/js/scene.js'],
  ['carry', 'app/js/carry.js'],
  ['ui', 'app/js/ui.js'],
  ['main', 'app/js/main.js'],
];

/**
 * Rebuild each module's imports as destructures from the wrapping IIFEs.
 *
 * This used to be a hand-maintained list, which meant adding one import to a module
 * broke the single-file build silently — the page loads and then dies on a name that
 * exists in `app/` but was never injected here. Deriving it from the real import
 * statements keeps the two in step by construction.
 *
 * Handles the two forms the codebase actually uses:
 *   import { a, b as c } from './engine.js'   ->  const { a, b: c } = NS_engine;
 *   import * as ui from './ui.js'             ->  const ui = NS_ui;
 */
function injectionsFor(src) {
  const lines = [];

  for (const m of src.matchAll(/^import\s+\{([^}]+)\}\s+from\s+'\.\/([A-Za-z0-9_]+)\.js';/gm)) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ': '));
    lines.push(`const { ${names.join(', ')} } = NS_${m[2]};`);
  }

  for (const m of src.matchAll(/^import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+'\.\/([A-Za-z0-9_]+)\.js';/gm)) {
    lines.push(`const ${m[1]} = NS_${m[2]};`);
  }

  return lines.join('\n');
}

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

const chaptersJson = read('app/content/chapters.json');
const uiStrings = read('app/content/ui.json');
const css = read(entry ? 'app/css/entry.css' : 'app/css/styles.css');

// Every authored chapter, keyed by the filename the manifest names, so the embedded
// build can serve openChapter() from memory. A chapter listed but not yet written is
// skipped — the manifest legitimately runs ahead of the content (ADR-0007).
const scenarios = {};
for (const chapter of JSON.parse(chaptersJson).chapters || []) {
  try {
    scenarios[chapter.file] = JSON.parse(read(`app/content/${chapter.file}`));
  } catch {
    console.log(`  skipping ${chapter.file} — not authored yet`);
  }
}
if (Object.keys(scenarios).length === 0) throw new Error('no chapters could be read');

let js = MODULES.map(([name, path]) => {
  const src = read(path);
  return wrapModule(name, src, injectionsFor(src));
}).join('\n');

// Embedded content uses the same bootstrap and chapter loading paths as the PWA.
const embeddedFetch = `
const fetch = async (input, init) => {
  const name = String(input).split('/').pop();
  const value = name === 'game.json' ? EMBEDDED_GAME : name === 'ui.json' ? EMBEDDED_UI : name === 'chapters.json' ? EMBEDDED_CHAPTERS : EMBEDDED_SCENARIOS[name];
  return value ? new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }) : globalThis.fetch(input, init);
};`;

// Extract the markup between <body> and </body> from the real index.html, so the two
// stay in step rather than being maintained twice.
const html = read(entry ? 'app/index.html' : 'app/practice.html');
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

const out = `<title>Business Simulator</title>
${viewportShim}
<style>
${css}
</style>

${bodyInner}

<script>
(function () {
  'use strict';
  const EMBEDDED_GAME = ${entry ? read('app/content/game.json').trim() : 'null'};
  const EMBEDDED_CHAPTERS = ${chaptersJson.trim()};
  const EMBEDDED_SCENARIOS = ${JSON.stringify(entry ? {} : scenarios)};
  const EMBEDDED_UI = ${entry ? "null" : uiStrings.trim()};
${embeddedFetch}
${js}
})();
</script>
`;

const dest = new URL(entry ? '../app/intro-standalone.html' : '../app/standalone.html', import.meta.url);
writeFileSync(dest, out);
console.log(`wrote ${dest.pathname}  (${(out.length / 1024).toFixed(1)} KB)`);
