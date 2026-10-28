import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, applyDecision, computeStats, exportProgress, importProgress, ProgressRepository } from '../src/core/progress.js';
import { MemoryStorageAdapter } from '../src/core/storage.js';
import { earnedBadgeIds } from '../src/core/badges.js';

const phish = { id: 'p1', difficulty: 'easy', isPhishing: true, category: 'paket', channel: 'email' };
const legit = { id: 'l1', difficulty: 'medium', isPhishing: false, category: 'intern', channel: 'email' };
const all = [phish, legit];
const at = new Date('2026-10-28T10:00:00Z');

test('erste Entscheidung zählt, Wiederholung nicht', () => {
  let p = createProgress('x', 'Test');
  const a = applyDecision(p, phish, 'report', 5, all, at);
  assert.equal(a.result.correct, true);
  assert.equal(a.result.firstAttempt, true);
  assert.ok(a.progress.score > 0);
  const b = applyDecision(a.progress, phish, 'open', 5, all, at);
  assert.equal(b.result.firstAttempt, false);
  assert.equal(b.progress.score, a.progress.score, 'Score bleibt bei Wiederholung');
  assert.equal(b.progress.history.length, 2);
  assert.equal(b.progress.answers.p1.action, 'report');
});

test('applyDecision ist pur (Eingabe unverändert)', () => {
  const p = createProgress('x', 'Test');
  const snapshot = JSON.stringify(p);
  applyDecision(p, phish, 'report', 5, all, at);
  assert.equal(JSON.stringify(p), snapshot);
});

test('Score fällt nie unter 0', () => {
  const p = createProgress('x', 'Test');
  const r = applyDecision(p, phish, 'open', 5, all, at);
  assert.equal(r.progress.score, 0);
  assert.equal(r.progress.xp, 10);
});

test('Badges werden einmalig vergeben', () => {
  const p = createProgress('x', 'Test');
  const a = applyDecision(p, phish, 'report', 5, all, at);
  assert.ok(a.result.newBadges.includes('erster-fang'));
  const b = applyDecision(a.progress, legit, 'safe', 5, all, at);
  assert.ok(!b.result.newBadges.includes('erster-fang'));
  assert.ok(b.result.newBadges.includes('komplett'));
  assert.ok(b.result.newBadges.includes('kein-fehlalarm'));
});

test('Serie und beste Serie', () => {
  let p = createProgress('x', 'Test');
  p = applyDecision(p, phish, 'report', 5, all, at).progress;
  p = applyDecision(p, legit, 'report', 5, all, at).progress;
  assert.equal(p.streak, 0);
  assert.equal(p.bestStreak, 1);
});

test('computeStats gruppiert korrekt', () => {
  let p = createProgress('x', 'Test');
  p = applyDecision(p, phish, 'report', 4, all, at).progress;
  p = applyDecision(p, legit, 'report', 6, all, at).progress;
  const s = computeStats(p, all);
  assert.equal(s.answered, 2);
  assert.equal(s.correct, 1);
  assert.equal(s.falsePositives, 1);
  assert.equal(s.avgSeconds, 5);
  assert.deepEqual(s.groups.difficulty.easy, { answered: 1, correct: 1 });
});

test('Export/Import Roundtrip', () => {
  let p = createProgress('x', 'Lena');
  p = applyDecision(p, phish, 'report', 4, all, at).progress;
  const back = importProgress(exportProgress(p));
  assert.equal(back.score, p.score);
  assert.equal(back.name, 'Lena');
  assert.deepEqual(back.answers, p.answers);
});

test('Import lehnt fremde oder kaputte Dateien ab', () => {
  assert.throws(() => importProgress('{kaputt'), /import.invalidJson/);
  assert.throws(() => importProgress('{"app":"andere"}'), /import.notPhishguard/);
  assert.throws(() => importProgress({ app: 'phishguard', progress: { version: 99 } }), /import.wrongVersion/);
});

test('Import bereinigt ungültige Werte', () => {
  const p = importProgress({ app: 'phishguard', progress: { version: 1, xp: -5, score: 'viel', answers: [], name: 'X'.repeat(100) } });
  assert.equal(p.xp, 0);
  assert.equal(p.score, 0);
  assert.deepEqual(p.answers, {});
  assert.equal(p.name.length, 40);
});

test('ProgressRepository: Profile anlegen, wechseln, löschen', async () => {
  const repo = new ProgressRepository(new MemoryStorageAdapter());
  const a = await repo.createProfile('A');
  const b = await repo.createProfile('B');
  assert.equal(await repo.activeProfileId(), b);
  await repo.switchProfile(a);
  assert.equal((await repo.load(a)).name, 'A');
  await repo.deleteProfile(a);
  assert.equal(await repo.activeProfileId(), b);
  assert.equal((await repo.listProfiles()).length, 1);
});

test('earnedBadgeIds bei leerem Fortschritt', () => {
  assert.deepEqual(earnedBadgeIds(createProgress('x', 'y'), all), []);
});
