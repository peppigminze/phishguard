#!/usr/bin/env node
/**
 * Validiert alle Szenarien (Schema + Inhaltsregeln) und prüft,
 * dass index.json und Dateisystem übereinstimmen. Exit-Code 1 bei Fehlern.
 */
import { readdir } from 'node:fs/promises';
import { loadPack, SCENARIO_DIR } from './load-pack.mjs';
import { validateScenario, validatePack } from '../src/core/validator.js';

let failed = false;
const { index, scenarios } = await loadPack();

const onDisk = (await readdir(SCENARIO_DIR)).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
const listed = [...index.files].sort();
for (const f of onDisk) if (!listed.includes(f)) { console.error(`✗ ${f} liegt im Ordner, fehlt aber in index.json`); failed = true; }
for (const f of listed) if (!onDisk.includes(f)) { console.error(`✗ ${f} steht in index.json, existiert aber nicht`); failed = true; }

for (const { file, data } of scenarios) {
  const r = validateScenario(data);
  if (data.id && `${data.id}.json` !== file) { console.error(`✗ ${file}: Dateiname muss <id>.json sein`); failed = true; }
  if (r.valid) console.log(`✓ ${file}`);
  else { failed = true; r.errors.forEach((e) => console.error(`✗ ${file}: ${e}`)); }
}
const pack = validatePack(scenarios.map((s) => s.data));
if (!pack.valid) { failed = true; pack.errors.filter((e) => e.startsWith('Doppelte')).forEach((e) => console.error(`✗ ${e}`)); }

console.log(failed ? '\nValidierung fehlgeschlagen.' : `\nAlle ${scenarios.length} Szenarien sind gültig.`);
process.exit(failed ? 1 : 0);
