import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDecision, scoreDecision, timeBonus, streakMultiplier, OUTCOMES,
  levelFromXp, xpForLevel, levelProgress, maxPackScore, DIFFICULTY_BASE, TIME_BONUS_MAX
} from '../src/core/scoring.js';

test('evaluateDecision: Phishing', () => {
  assert.deepEqual(evaluateDecision(true, 'report'), { outcome: OUTCOMES.CAUGHT, correct: true });
  assert.deepEqual(evaluateDecision(true, 'safe'), { outcome: OUTCOMES.MISSED, correct: false });
  assert.deepEqual(evaluateDecision(true, 'open'), { outcome: OUTCOMES.COMPROMISED, correct: false });
});

test('evaluateDecision: legitime Nachricht – sicher und öffnen sind beide korrekt', () => {
  assert.equal(evaluateDecision(false, 'safe').correct, true);
  assert.equal(evaluateDecision(false, 'open').correct, true);
  assert.deepEqual(evaluateDecision(false, 'report'), { outcome: OUTCOMES.FALSE_POSITIVE, correct: false });
});

test('evaluateDecision: unbekannte Aktion wirft', () => {
  assert.throws(() => evaluateDecision(true, 'delete'));
});

test('timeBonus: Grenzen und linearer Abfall', () => {
  assert.equal(timeBonus(1.9), 0, 'unter 2 s kein Bonus (Anti-Durchklicken)');
  assert.equal(timeBonus(2), TIME_BONUS_MAX);
  assert.equal(timeBonus(10), TIME_BONUS_MAX);
  assert.equal(timeBonus(35), 25);
  assert.equal(timeBonus(60), 0);
  assert.equal(timeBonus(600), 0);
  assert.equal(timeBonus(NaN), 0);
});

test('streakMultiplier: +10 % pro Serie, gedeckelt bei +50 %', () => {
  assert.equal(streakMultiplier(0), 1);
  assert.equal(streakMultiplier(3), 1.3);
  assert.equal(streakMultiplier(5), 1.5);
  assert.equal(streakMultiplier(42), 1.5);
  assert.equal(streakMultiplier(-3), 1);
});

test('scoreDecision: korrekt mit Bonus und Serie', () => {
  const r = scoreDecision({ difficulty: 'medium', outcome: OUTCOMES.CAUGHT, seconds: 8, streakBefore: 2 });
  assert.equal(r.points, Math.round((150 + 50) * 1.2));
  assert.equal(r.streakAfter, 3);
  assert.equal(r.xp, r.points + 10);
});

test('scoreDecision: Phishing geöffnet kostet halbe Basis und setzt Serie zurück', () => {
  const r = scoreDecision({ difficulty: 'hard', outcome: OUTCOMES.COMPROMISED, seconds: 5, streakBefore: 4 });
  assert.equal(r.points, -100);
  assert.equal(r.streakAfter, 0);
  assert.equal(r.xp, 10, 'Teilnahme-XP auch bei Fehlern (Lernen zählt)');
});

test('scoreDecision: Fehlalarm und übersehen geben 0 Punkte', () => {
  for (const outcome of [OUTCOMES.FALSE_POSITIVE, OUTCOMES.MISSED]) {
    const r = scoreDecision({ difficulty: 'easy', outcome, seconds: 5, streakBefore: 3 });
    assert.equal(r.points, 0);
    assert.equal(r.streakAfter, 0);
  }
});

test('scoreDecision: schwer gibt mehr als leicht', () => {
  const easy = scoreDecision({ difficulty: 'easy', outcome: OUTCOMES.CAUGHT, seconds: 30 });
  const hard = scoreDecision({ difficulty: 'hard', outcome: OUTCOMES.CAUGHT, seconds: 30 });
  assert.ok(hard.points > easy.points);
  assert.equal(hard.base, DIFFICULTY_BASE.hard);
});

test('scoreDecision: unbekannte Schwierigkeit wirft', () => {
  assert.throws(() => scoreDecision({ difficulty: 'extrem', outcome: OUTCOMES.CAUGHT, seconds: 5 }));
});

test('Level-Kurve ist monoton und konsistent', () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(xpForLevel(2), 250);
  assert.equal(levelFromXp(249), 1);
  assert.equal(levelFromXp(250), 2);
  assert.equal(levelFromXp(750), 3);
  for (let l = 1; l < 20; l++) assert.ok(xpForLevel(l + 1) > xpForLevel(l));
  assert.equal(levelFromXp(1e9), 20, 'Maximallevel');
  const p = levelProgress(500);
  assert.equal(p.level, 2);
  assert.ok(p.ratio > 0 && p.ratio < 1);
});

test('maxPackScore summiert perfekten Durchlauf', () => {
  const pack = [{ difficulty: 'easy', isPhishing: true }, { difficulty: 'easy', isPhishing: false }];
  // 1. 150*1.0 = 150, 2. 150*1.1 = 165
  assert.equal(maxPackScore(pack), 315);
});
