/** Lädt das Szenario-Pack in Node (für Tests und Skripte). */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const SCENARIO_DIR = fileURLToPath(new URL('../data/scenarios/', import.meta.url));

export async function loadPack() {
  const index = JSON.parse(await readFile(new URL('index.json', `file://${SCENARIO_DIR}`), 'utf8'));
  const scenarios = [];
  for (const file of index.files) {
    scenarios.push({ file, data: JSON.parse(await readFile(new URL(file, `file://${SCENARIO_DIR}`), 'utf8')) });
  }
  return { index, scenarios };
}
