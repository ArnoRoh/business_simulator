// Number and currency formatting.
//
// Amounts are stored locale-neutral (plain integers) and formatted only at render
// time — AGENTS.md section 6. Never author a currency symbol into content.

let currency = 'TZS';
let locale = 'en';

export function setLocale(nextLocale, nextCurrency) {
  locale = nextLocale || locale;
  currency = nextCurrency || currency;
}

// Grouped integer, no decimals. Small-business amounts are whole shillings.
export function money(amount) {
  const n = Math.round(Number(amount) || 0);
  const sign = n < 0 ? '-' : '';
  const grouped = Math.abs(n).toLocaleString(locale, { maximumFractionDigits: 0 });
  return `${sign}${currency} ${grouped}`;
}

// Compact form for tight spaces (stat tiles, chart axes).
export function moneyShort(amount) {
  const n = Math.round(Number(amount) || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return `${sign}${abs}`;
}

export function count(n) {
  return Math.round(Number(n) || 0).toLocaleString(locale);
}

// Proportions read more reliably than percentages for this audience —
// docs/localization.md. Used for prediction accuracy.
export function proportion(part, whole) {
  const p = Math.round(Number(part) || 0);
  const w = Math.round(Number(whole) || 0);
  if (w <= 0) return '—';
  return `${p} of ${w}`;
}

export function percent(fraction) {
  return `${Math.round((Number(fraction) || 0) * 100)}%`;
}
