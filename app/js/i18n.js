// Language, strings and plurals.
//
// Rules this file exists to enforce (docs/localization.md, "Language"):
//
//   1. No user-facing string lives in code. Everything comes from content/ui.json.
//   2. No sentence is built by concatenation. Word order differs between languages,
//      so templates carry whole sentences with named placeholders.
//   3. Plurals go through Intl.PluralRules, never `if (n === 1)`.
//
// Strings are stored key-major — { "btn.continue": { en: "...", sw: "..." } } — so a
// reviewer reads the two languages side by side instead of scrolling between two
// blocks. Scenario content uses the same shape, which is what `localised()` reads.

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
];

const FALLBACK = 'en';

let language = FALLBACK;
let strings = {};
let onChange = null;

export function loadStrings(table) {
  strings = table || {};
}

export function setLanguage(code) {
  if (!LANGUAGES.some((l) => l.code === code)) return language;
  language = code;
  if (typeof document !== 'undefined') document.documentElement.lang = code;
  if (onChange) onChange(code);
  return language;
}

export function getLanguage() {
  return language;
}

export function onLanguageChange(fn) {
  onChange = fn;
}

/**
 * Pick the right variant out of a localised value.
 *
 * Accepts a bare string too, so scenario content can be part-translated during
 * authoring without the app breaking.
 */
export function localised(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return String(value);
  return value[language] ?? value[FALLBACK] ?? '';
}

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole
  ));
}

/**
 * Look up a string.
 *
 * A missing key returns the key itself rather than an empty string — a visible
 * `pnl.sales` in the interface gets fixed; a blank space does not get noticed.
 * scripts/validate-i18n.mjs is what stops that reaching anyone.
 */
export function t(key, params) {
  const entry = strings[key];
  if (entry === undefined) return key;

  const template = typeof entry === 'string'
    ? entry
    : (entry[language] ?? entry[FALLBACK]);

  if (template === undefined || template === null) return key;
  return interpolate(template, params);
}

/**
 * Plural-aware lookup. Given `n`, looks for `key.one` / `key.other` and whichever
 * other categories the language uses, via Intl.PluralRules.
 *
 * `{n}` is available to the template automatically, already locale-formatted by the
 * caller if it needs to be.
 */
export function tCount(key, n, params = {}) {
  let category = 'other';
  try {
    category = new Intl.PluralRules(language).select(n);
  } catch {
    category = n === 1 ? 'one' : 'other';
  }

  const withCount = { n, ...params };
  const specific = `${key}.${category}`;
  if (strings[specific] !== undefined) return t(specific, withCount);

  const other = `${key}.other`;
  if (strings[other] !== undefined) return t(other, withCount);

  return t(key, withCount);
}

/** Every key the string table knows about — used by the parity check. */
export function knownKeys() {
  return Object.keys(strings);
}
