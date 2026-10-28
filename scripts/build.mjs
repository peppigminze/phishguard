#!/usr/bin/env node
/**
 * "Build" ohne Bundler: Precache-Manifest erzeugen und die statischen
 * App-Dateien nach _site/ kopieren (für GitHub Pages).
 */
import { cp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, APP_ENTRIES, buildManifest } from './build-manifest.mjs';

const OUT = join(ROOT, '_site');
const { version, count } = await buildManifest();
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const entry of [...APP_ENTRIES, 'precache-manifest.js']) {
  await cp(join(ROOT, entry), join(OUT, entry), { recursive: true });
}
// GitHub Pages: Jekyll deaktivieren (sonst werden Dateien mit _ ignoriert)
await writeFile(join(OUT, '.nojekyll'), '');
console.log(`_site/ erstellt: ${count} Dateien im Precache, Version ${version}`);
