#!/usr/bin/env node
/**
 * Balancing-Bericht: Verteilung nach Schwierigkeit, Kanal, Kategorie,
 * Anteil legitimer Nachrichten und erreichbare Punkte / Level.
 */
import { loadPack } from './load-pack.mjs';
import { maxPackScore, levelFromXp, PARTICIPATION_XP } from '../src/core/scoring.js';

const { scenarios } = await loadPack();
const list = scenarios.map((s) => s.data);
const count = (key) => list.reduce((m, s) => ((m[s[key]] = (m[s[key]] ?? 0) + 1), m), {});
const legit = list.filter((s) => !s.isPhishing).length;
const max = maxPackScore(list);
const maxXp = max + list.length * PARTICIPATION_XP;

console.log(`Szenarien:      ${list.length}`);
console.log(`Legitim:        ${legit} (${Math.round((legit / list.length) * 100)} %)`);
console.log('Schwierigkeit: ', count('difficulty'));
console.log('Kanal:         ', count('channel'));
console.log('Kategorie:     ', count('category'));
for (const d of ['easy', 'medium', 'hard']) {
  const sub = list.filter((s) => s.difficulty === d);
  const l = sub.filter((s) => !s.isPhishing).length;
  console.log(`  ${d.padEnd(6)} ${sub.length} Szenarien, davon ${l} legitim (${Math.round((l / sub.length) * 100)} %)`);
}
const avgInd = (list.reduce((a, s) => a + s.indicators.length, 0) / list.length).toFixed(1);
console.log(`Ø Indikatoren:  ${avgInd}`);
console.log(`Max. Punkte (perfekter Durchlauf): ${max}`);
console.log(`Max. XP erster Durchlauf: ${maxXp} -> Level ${levelFromXp(maxXp)}`);
