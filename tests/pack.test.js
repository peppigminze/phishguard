/**
 * Prüft das mitgelieferte Szenario-Pack als Ganzes (Inhalt + Balancing).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadPack } from '../scripts/load-pack.mjs';
import { validatePack, DIFFICULTIES, CHANNELS } from '../src/core/validator.js';
import de from '../src/i18n/de.js';
import { BADGES } from '../src/core/badges.js';

const { scenarios } = await loadPack();
const list = scenarios.map((s) => s.data);

test('alle Szenarien sind gültig', () => {
  const r = validatePack(list);
  assert.equal(r.valid, true, r.errors.join('\n'));
});

test('mindestens 30 Szenarien', () => {
  assert.ok(list.length >= 30, `nur ${list.length}`);
});

test('rund 30 % legitime Nachrichten (25–40 %)', () => {
  const ratio = list.filter((s) => !s.isPhishing).length / list.length;
  assert.ok(ratio >= 0.25 && ratio <= 0.4, `Anteil legitim: ${ratio}`);
});

test('jede Schwierigkeit hat mind. 8 Szenarien und mind. 2 legitime', () => {
  for (const d of DIFFICULTIES) {
    const sub = list.filter((s) => s.difficulty === d);
    assert.ok(sub.length >= 8, `${d}: ${sub.length}`);
    assert.ok(sub.filter((s) => !s.isPhishing).length >= 2, `${d}: zu wenig legitime`);
  }
});

test('alle Kanäle sind vertreten, inkl. legitimer SMS und Anrufe', () => {
  for (const c of CHANNELS) {
    assert.ok(list.some((s) => s.channel === c && s.isPhishing), `${c} Phishing fehlt`);
    assert.ok(list.some((s) => s.channel === c && !s.isPhishing), `${c} legitim fehlt`);
  }
});

test('Pflicht-Themen aus dem Konzept sind abgedeckt', () => {
  for (const cat of ['paket', 'bank', 'zahlung', 'behoerde', 'telekom', 'it-login', 'ceo-fraud', 'rechnung', 'quishing', 'oev']) {
    assert.ok(list.some((s) => s.category === cat), `Kategorie ${cat} fehlt`);
  }
  assert.ok(list.some((s) => s.qr), 'kein QR-Szenario');
});

test('keine echten Marken-/Domainnamen im Pack', async () => {
  const forbidden = /\b(post\.ch|sbb|twint|swisscom|ubs|postfinance|raiffeisen|microsoft|outlook\.com|gmail|google|apple|paypal)\b/i;
  for (const s of list) assert.doesNotMatch(JSON.stringify(s), forbidden, s.id);
});

test('i18n: kein ß und alle Badges übersetzt', async () => {
  const src = await readFile(new URL('../src/i18n/de.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('ß'));
  for (const b of BADGES) assert.ok(de.badges[b.id]?.title && de.badges[b.id]?.desc, b.id);
  for (const s of list) assert.ok(de.category[s.category], `Kategorie ${s.category} ohne Übersetzung`);
});

test('Lexikon: kein ß, Meldestellen vorhanden', async () => {
  const raw = await readFile(new URL('../data/lexicon/de.json', import.meta.url), 'utf8');
  assert.ok(!raw.includes('ß'));
  const lex = JSON.parse(raw);
  const ids = lex.sections.flatMap((s) => s.entries.map((e) => e.id));
  assert.ok(ids.includes('meldestellen'));
  assert.ok(lex.tips.length >= 5);
});
