#!/usr/bin/env node
/**
 * Erzeugt precache-manifest.js für den Service Worker:
 * Liste aller App-Dateien + Inhalts-Hash als Cache-Version.
 * Wird von `npm run build` und in der CI aufgerufen.
 */
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const APP_ENTRIES = ['index.html', 'manifest.webmanifest', 'sw.js', 'icons', 'src', 'data'];

async function walk(path) {
  const s = await stat(path);
  if (s.isFile()) return [path];
  const out = [];
  for (const e of await readdir(path)) out.push(...await walk(join(path, e)));
  return out;
}

export async function collectAppFiles(root = ROOT) {
  const files = [];
  for (const entry of APP_ENTRIES) files.push(...await walk(join(root, entry)));
  return files.map((f) => relative(root, f).split(sep).join('/')).sort();
}

export async function buildManifest(root = ROOT) {
  const files = (await collectAppFiles(root)).filter((f) => f !== 'sw.js');
  const hash = createHash('sha256');
  for (const f of files) hash.update(f).update(await readFile(join(root, f)));
  hash.update(await readFile(join(root, 'sw.js')));
  const version = hash.digest('hex').slice(0, 12);
  const list = ['./', ...files.map((f) => `./${f}`)];
  const body = `/* Automatisch erzeugt von scripts/build-manifest.mjs – nicht von Hand bearbeiten. */\nself.__PRECACHE = ${JSON.stringify({ version, files: list }, null, 2)};\n`;
  await writeFile(join(root, 'precache-manifest.js'), body);
  return { version, count: list.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { version, count } = await buildManifest();
  console.log(`precache-manifest.js: ${count} Dateien, Version ${version}`);
}
