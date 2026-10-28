/**
 * Minimales i18n. Neue Sprache: Datei src/i18n/<code>.js mit gleichem
 * Schlüsselbaum anlegen und in LOCALES registrieren. Fehlende Schlüssel
 * fallen auf Deutsch zurück.
 */
import de from './de.js';

export const LOCALES = { de };
export const FALLBACK = 'de';
let current = FALLBACK;

export function setLocale(code) {
  if (LOCALES[code]) current = code;
  document?.documentElement?.setAttribute('lang', LOCALES[current].meta.htmlLang);
}

export function getLocale() {
  return current;
}

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), dict);
}

/**
 * Übersetzt einen Schlüssel. Platzhalter: {name}
 * @example t('dashboard.greeting', { name: 'Lena' })
 */
export function t(key, params = {}) {
  let value = lookup(LOCALES[current], key) ?? lookup(LOCALES[FALLBACK], key);
  if (value == null) {
    console.warn(`[i18n] Fehlender Schlüssel: ${key}`);
    return key;
  }
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

/** Formatiert Zahlen im Schweizer Stil (Apostroph als Tausendertrennzeichen). */
export function formatNumber(n, digits = 0) {
  return new Intl.NumberFormat(LOCALES[current].meta.numberLocale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(n);
}

export function formatPercent(ratio) {
  return `${formatNumber(Math.round(ratio * 100))} %`;
}
