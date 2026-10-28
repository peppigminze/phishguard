/**
 * Lädt das Szenario-Pack aus /data/scenarios.
 *
 * index.json listet die Dateien. Jede Datei wird validiert; ungültige
 * Szenarien werden übersprungen (und in der Konsole gemeldet), damit ein
 * fehlerhafter Community-Beitrag nie die ganze App lahmlegt.
 */
import { validateScenario, DIFFICULTIES } from './validator.js';

export async function loadScenarios(baseUrl = './data/scenarios/', fetchImpl = globalThis.fetch) {
  const indexRes = await fetchImpl(new URL('index.json', new URL(baseUrl, globalThis.location?.href ?? 'http://localhost/')));
  if (!indexRes.ok) throw new Error(`Szenario-Index nicht ladbar (${indexRes.status})`);
  const index = await indexRes.json();

  // Ein Retry pro Datei: Bei kurzem Verbindungsabbruch während des Ladens
  // soll nicht still ein Teil des Packs fehlen.
  const fetchJson = async (file, attempt = 0) => {
    try {
      const res = await fetchImpl(new URL(file, new URL(baseUrl, globalThis.location?.href ?? 'http://localhost/')));
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 1) throw err;
      await new Promise((r) => setTimeout(r, 300));
      return fetchJson(file, attempt + 1);
    }
  };
  const results = await Promise.allSettled(index.files.map((file) => fetchJson(file)));

  const scenarios = [];
  const problems = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      problems.push(String(r.reason));
      return;
    }
    const v = validateScenario(r.value);
    if (v.valid) scenarios.push(r.value);
    else problems.push(`${index.files[i]}: ${v.errors.join('; ')}`);
  });
  if (problems.length) console.warn('[scenarios] Übersprungen:', problems);
  return sortScenarios(scenarios);
}

/** Sortierung: Schwierigkeit, dann Index-Reihenfolge stabil. */
export function sortScenarios(list) {
  return [...list].sort((a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty));
}

/**
 * Stellt eine Trainingsrunde zusammen.
 * @param {object[]} scenarios
 * @param {{difficulty?: string|'all', onlyOpen?: boolean, answers?: object, size?: number, rng?: () => number}} opts
 */
export function buildSession(scenarios, { difficulty = 'all', onlyOpen = false, answers = {}, size = 8, rng = Math.random } = {}) {
  let pool = scenarios.filter((s) => difficulty === 'all' || s.difficulty === difficulty);
  if (onlyOpen) {
    const open = pool.filter((s) => !answers[s.id]);
    if (open.length) pool = open;
  }
  // Fisher-Yates mit injizierbarem Zufall (testbar)
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(size, arr.length));
}
