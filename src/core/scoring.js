/**
 * Scoring – ausschliesslich pure Funktionen, damit sie einfach testbar sind.
 *
 * Regeln (siehe auch docs/adr/0002-scoring.md):
 *  - Basispunkte nach Schwierigkeit: Leicht 100, Mittel 150, Schwer 200.
 *  - Zeitbonus bis 50 Punkte: voll bis 10 s, linear auf 0 bei 60 s.
 *    Unter 2 s gibt es keinen Bonus (verhindert blindes Durchklicken).
 *  - Streak-Multiplikator: +10 % pro richtiger Antwort in Folge, max. +50 %.
 *  - "Link/Anhang öffnen" bei Phishing kostet die Hälfte der Basispunkte.
 *  - Falsch gemeldet (Fehlalarm) oder Phishing übersehen: 0 Punkte, Streak weg.
 */

export const ACTIONS = ['safe', 'report', 'open'];

export const DIFFICULTY_BASE = Object.freeze({ easy: 100, medium: 150, hard: 200 });

export const TIME_BONUS_MAX = 50;
export const TIME_BONUS_FULL_UNTIL = 10; // Sekunden
export const TIME_BONUS_ZERO_AT = 60; // Sekunden
export const TIME_BONUS_MIN_SECONDS = 2;

export const STREAK_STEP = 0.1;
export const STREAK_CAP = 5;

export const COMPROMISE_PENALTY_FACTOR = 0.5;
export const PARTICIPATION_XP = 10;

/** Ergebnis-Typen einer Entscheidung. */
export const OUTCOMES = Object.freeze({
  CAUGHT: 'caught', // Phishing korrekt gemeldet
  TRUSTED: 'trusted', // legitime Nachricht korrekt als sicher eingestuft
  MISSED: 'missed', // Phishing als sicher eingestuft
  COMPROMISED: 'compromised', // Phishing-Link/Anhang geöffnet
  FALSE_POSITIVE: 'false-positive' // legitime Nachricht gemeldet
});

/**
 * Bewertet eine Entscheidung fachlich.
 * Bei legitimen Nachrichten ist "öffnen" genauso korrekt wie "sicher".
 */
export function evaluateDecision(isPhishing, action) {
  if (!ACTIONS.includes(action)) throw new Error(`Unbekannte Aktion: ${action}`);
  if (isPhishing) {
    if (action === 'report') return { outcome: OUTCOMES.CAUGHT, correct: true };
    if (action === 'open') return { outcome: OUTCOMES.COMPROMISED, correct: false };
    return { outcome: OUTCOMES.MISSED, correct: false };
  }
  if (action === 'report') return { outcome: OUTCOMES.FALSE_POSITIVE, correct: false };
  return { outcome: OUTCOMES.TRUSTED, correct: true };
}

/** Zeitbonus in Punkten (ganzzahlig). */
export function timeBonus(seconds) {
  if (!Number.isFinite(seconds) || seconds < TIME_BONUS_MIN_SECONDS) return 0;
  if (seconds <= TIME_BONUS_FULL_UNTIL) return TIME_BONUS_MAX;
  if (seconds >= TIME_BONUS_ZERO_AT) return 0;
  const ratio = (TIME_BONUS_ZERO_AT - seconds) / (TIME_BONUS_ZERO_AT - TIME_BONUS_FULL_UNTIL);
  return Math.round(TIME_BONUS_MAX * ratio);
}

/** Multiplikator abhängig von der Streak *vor* der aktuellen Antwort. */
export function streakMultiplier(streakBefore) {
  const s = Math.max(0, Math.min(STREAK_CAP, Math.floor(streakBefore || 0)));
  return Math.round((1 + s * STREAK_STEP) * 100) / 100;
}

/**
 * Berechnet Punkte und neue Streak.
 * @param {{difficulty:string, outcome:string, seconds:number, streakBefore:number}} p
 */
export function scoreDecision({ difficulty, outcome, seconds, streakBefore = 0 }) {
  const base = DIFFICULTY_BASE[difficulty];
  if (base == null) throw new Error(`Unbekannte Schwierigkeit: ${difficulty}`);

  const correct = outcome === OUTCOMES.CAUGHT || outcome === OUTCOMES.TRUSTED;
  if (correct) {
    const bonus = timeBonus(seconds);
    const multiplier = streakMultiplier(streakBefore);
    const points = Math.round((base + bonus) * multiplier);
    return {
      points,
      base,
      timeBonus: bonus,
      multiplier,
      streakAfter: streakBefore + 1,
      xp: points + PARTICIPATION_XP
    };
  }

  const points = outcome === OUTCOMES.COMPROMISED ? -Math.round(base * COMPROMISE_PENALTY_FACTOR) : 0;
  return { points, base, timeBonus: 0, multiplier: 1, streakAfter: 0, xp: PARTICIPATION_XP };
}

// --- Level ------------------------------------------------------------------

export const LEVEL_STEP_XP = 250;
export const MAX_LEVEL = 20;

/** Gesamt-XP, die für das Erreichen eines Levels nötig sind (Level 1 = 0 XP). */
export function xpForLevel(level) {
  const n = Math.max(1, Math.floor(level));
  return (LEVEL_STEP_XP * (n - 1) * n) / 2;
}

export function levelFromXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

/** Fortschritt innerhalb des aktuellen Levels (0..1). */
export function levelProgress(xp) {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, current: 0, needed: 0, ratio: 1 };
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return { level, current: xp - start, needed: end - start, ratio: (xp - start) / (end - start) };
}

/** Maximal erreichbare Punkte eines Packs (perfekter, schneller Durchlauf). */
export function maxPackScore(scenarios) {
  let streak = 0;
  let total = 0;
  for (const s of scenarios) {
    const r = scoreDecision({
      difficulty: s.difficulty,
      outcome: s.isPhishing ? OUTCOMES.CAUGHT : OUTCOMES.TRUSTED,
      seconds: TIME_BONUS_FULL_UNTIL,
      streakBefore: streak
    });
    total += r.points;
    streak = r.streakAfter;
  }
  return total;
}
