// Checks that every string the interface asks for actually exists, in every language.
//
// The failure this prevents is quiet: i18n.t() returns the key itself when it cannot
// find a string, so a missing entry ships as a literal `pnl.sales` on screen, and a
// language missing one entry silently falls back to English. Neither throws, and
// neither is obvious in a language you do not read — which is precisely the situation
// with the Swahili draft.
//
// Run: node scripts/validate-i18n.mjs

import { readFileSync, readdirSync } from 'node:fs';

const LANGUAGES = ['en', 'sw'];
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const strings = JSON.parse(read('app/content/ui.json'));

// Every chapter in the manifest, not one hardcoded file (ADR-0007). A chapter that has
// not been authored yet is reported and skipped rather than crashing the check — the
// manifest legitimately names chapters ahead of their content.
const manifest = JSON.parse(read('app/content/chapters.json'));
const chapters = [];
const missing = [];
for (const chapter of manifest.chapters || []) {
  try {
    chapters.push([chapter.id, JSON.parse(read(`app/content/${chapter.file}`))]);
  } catch {
    missing.push(chapter.file);
  }
}

let problems = 0;
const fail = (msg) => { console.log(`  FAIL ${msg}`); problems += 1; };

// --- every entry carries every language ----------------------------------

console.log('\nui.json — language coverage:');
const keys = Object.keys(strings).filter((k) => !k.startsWith('_'));
for (const key of keys) {
  const entry = strings[key];
  if (typeof entry !== 'object') { fail(`${key} is not an object`); continue; }
  for (const lang of LANGUAGES) {
    if (typeof entry[lang] !== 'string' || entry[lang].trim() === '') {
      fail(`${key} is missing "${lang}"`);
    }
  }
}
console.log(`  ${keys.length} keys × ${LANGUAGES.length} languages`);

// --- placeholders survive translation ------------------------------------

console.log('\nui.json — placeholders match across languages:');
const placeholders = (s) => (s.match(/\{(\w+)\}/g) || []).sort().join(',');
for (const key of keys) {
  const entry = strings[key];
  if (typeof entry !== 'object') continue;
  const reference = placeholders(entry.en || '');
  for (const lang of LANGUAGES) {
    if (typeof entry[lang] !== 'string') continue;
    if (placeholders(entry[lang]) !== reference) {
      fail(`${key} "${lang}" has placeholders [${placeholders(entry[lang])}], en has [${reference}]`);
    }
  }
}

// --- every key the code asks for exists ----------------------------------

console.log('\ncode — keys requested vs keys defined:');
const sources = readdirSync(new URL('../app/js/', import.meta.url))
  .filter((f) => f.endsWith('.js'))
  .map((f) => [f, read(`app/js/${f}`)]);

const requested = new Set();
const prefixes = new Set();

for (const [file, src] of sources) {
  for (const m of src.matchAll(/\bt(?:Count)?\(\s*'([a-zA-Z0-9_.]+)'/g)) requested.add([m[1], file]);
  // Template-literal keys such as t(`touch.${dim}`) cannot be resolved statically —
  // check that the prefix has at least one entry rather than pretending to know more.
  for (const m of src.matchAll(/\bt(?:Count)?\(\s*`([a-zA-Z0-9_.]+)\$\{/g)) prefixes.add([m[1], file]);
}

const known = new Set(keys);
const pluralCategories = ['one', 'other', 'zero', 'two', 'few', 'many'];

for (const [key, file] of requested) {
  if (known.has(key)) continue;
  if (pluralCategories.some((c) => known.has(`${key}.${c}`))) continue;
  fail(`${file} asks for "${key}", which ui.json does not define`);
}

for (const [prefix, file] of prefixes) {
  if (![...known].some((k) => k.startsWith(prefix))) {
    fail(`${file} builds keys starting "${prefix}", and ui.json has none`);
  }
}
console.log(`  ${requested.size} literal keys, ${prefixes.size} built keys`);

// --- unused entries are reported, not failed -----------------------------

// Plenty of keys are reached through a variable (`t(row.key)`) or a ternary
// (`t(open ? 'a' : 'b')`), so "does this key appear anywhere in the source" is the only
// honest test for deadness. The strict check above is what catches real breakage.
const mentioned = new Set([...requested].map(([k]) => k));
for (const [, src] of sources) {
  // Dotted string literals, wherever they appear — including inside ternaries and
  // object fields such as record.js's `indicatorKey`.
  for (const m of src.matchAll(/'([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)'/g)) mentioned.add(m[1]);
  // The fixed part of any interpolated key, e.g. `profile.detail.${trend}`.
  for (const m of src.matchAll(/`([a-zA-Z0-9_.]+)\$\{/g)) mentioned.add(m[1]);
}

const unused = keys.filter((k) => ![...mentioned].some((u) => k === u || k.startsWith(u)));
if (unused.length) {
  console.log(`\n  unused (not an error, but worth pruning): ${unused.join(', ')}`);
}

// --- scenario content carries every language -----------------------------

console.log('\nchapters — content language coverage:');
const CONTENT_KEYS = new Set([
  'situation', 'label', 'detail', 'reveals', 'outcome', 'lesson',
  'prompt', 'predictQuestion', 'conceptLabel', 'title', 'blurb', 'cause',
  // Chapter-level content (ADR-0007): the manifest's one-line framing, the notes a
  // carried flag adds to an opening, and a product line's name in the ledger.
  'shift', 'note', 'description',
]);

let localised = 0;
const walk = (node, path) => {
  for (const [key, value] of Object.entries(node)) {
    const here = `${path}.${key}`;
    if (CONTENT_KEYS.has(key)) {
      if (typeof value === 'string') {
        fail(`${here} is a bare string — it must be { en, sw }`);
      } else if (value && typeof value === 'object') {
        localised += 1;
        for (const lang of LANGUAGES) {
          if (typeof value[lang] !== 'string' || value[lang].trim() === '') {
            fail(`${here} is missing "${lang}"`);
          }
        }
      }
    } else if (value && typeof value === 'object') {
      walk(value, here);
    }
  }
};
walk(manifest, 'chapters.json');
for (const [id, scenario] of chapters) walk(scenario, id);
console.log(`  ${chapters.length} chapter(s), ${localised} localised content strings × ${LANGUAGES.length} languages`);
if (missing.length) console.log(`  not authored yet, skipped: ${missing.join(', ')}`);

console.log(`\n${problems === 0 ? 'all good' : `${problems} problem(s)`}\n`);
process.exit(problems === 0 ? 0 : 1);
