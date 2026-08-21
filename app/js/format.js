// Number and currency formatting.
//
// Amounts are stored locale-neutral (plain integers) and formatted only at render
// time — AGENTS.md section 6. Never author a currency symbol into content.

import { t, getLanguage } from './i18n.js';

let currency = 'TZS';

export function setCurrency(nextCurrency) {
  currency = nextCurrency || currency;
}

/** Digit grouping follows the interface language. */
function localeTag() {
  return getLanguage() === 'sw' ? 'sw-TZ' : 'en-GB';
}

// Grouped integer, no decimals. Small-business amounts are whole shillings.
//
// The currency stays the ISO code in both languages. "TSh" and the local "1,500/="
// notation are both plausible for Tanzania, but inventing regulatory or commercial
// detail is exactly what AGENTS.md section 6 forbids — it is logged for local review
// instead.
export function money(amount) {
  const n = Math.round(Number(amount) || 0);
  const sign = n < 0 ? '-' : '';
  const grouped = Math.abs(n).toLocaleString(localeTag(), { maximumFractionDigits: 0 });
  return `${sign}${currency} ${grouped}`;
}

// Compact form for tight spaces (stat tiles, chart axes). Carries the currency, because
// a bare "150k" sitting next to a unit count is ambiguous.
export function moneyShort(amount) {
  const n = Math.round(Number(amount) || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${currency} ${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}${currency} ${Math.round(abs / 1000)}k`;
  return `${sign}${currency} ${abs}`;
}

// Without the currency — for axes and anywhere the unit is already established.
export function compact(amount) {
  const n = Math.round(Number(amount) || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return `${sign}${abs}`;
}

/** Always signed, for deltas where the direction is the point. */
export function moneySigned(amount) {
  const n = Math.round(Number(amount) || 0);
  return n >= 0 ? `+${money(n)}` : money(n);
}

export function count(n) {
  return Math.round(Number(n) || 0).toLocaleString(localeTag());
}

// Proportions read more reliably than percentages for this audience —
// docs/localization.md. Used for prediction accuracy.
//
// Built from a template rather than concatenated: "3 of 16" and "3 kati ya 16" do not
// share a word order, and docs/localization.md rule 2 forbids assembling sentences
// from fragments.
export function proportion(part, whole) {
  const p = Math.round(Number(part) || 0);
  const w = Math.round(Number(whole) || 0);
  if (w <= 0) return '—';
  return t('profile.tally', { part: count(p), whole: count(w) });
}

export function percent(fraction) {
  return `${Math.round((Number(fraction) || 0) * 100)}%`;
}
