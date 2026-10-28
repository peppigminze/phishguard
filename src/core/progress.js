/**
 * Fortschritt pro Nutzerprofil.
 *
 * `applyDecision` ist pur (gibt einen neuen Zustand zurück) und damit testbar.
 * `ProgressRepository` kapselt die Persistenz über den StorageAdapter.
 */
import { evaluateDecision, scoreDecision, levelFromXp } from './scoring.js';
import { earnedBadgeIds } from './badges.js';

export const PROGRESS_VERSION = 1;
const HISTORY_LIMIT = 500;

export function createProgress(profileId, name) {
  return {
    version: PROGRESS_VERSION,
    profileId,
    name,
    createdAt: new Date().toISOString(),
    xp: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    answers: {}, // erster Versuch pro Szenario
    history: [], // alle Versuche, neueste zuletzt
    badges: {} // id -> ISO-Zeitpunkt
  };
}

/**
 * Wendet eine Entscheidung auf den Fortschritt an.
 * Punkte, XP und Streak zählen nur beim ersten Versuch eines Szenarios –
 * Wiederholungen dienen dem Üben und werden nur im Verlauf protokolliert.
 *
 * @returns {{ progress: object, result: object }}
 */
export function applyDecision(progress, scenario, action, seconds, allScenarios = [], now = new Date()) {
  const next = structuredClone(progress);
  const { outcome, correct } = evaluateDecision(scenario.isPhishing, action);
  const firstAttempt = !next.answers[scenario.id];
  const at = now.toISOString();
  const levelBefore = levelFromXp(next.xp);

  let score = { points: 0, base: 0, timeBonus: 0, multiplier: 1, streakAfter: next.streak, xp: 0 };
  if (firstAttempt) {
    score = scoreDecision({ difficulty: scenario.difficulty, outcome, seconds, streakBefore: next.streak });
    next.score = Math.max(0, next.score + score.points);
    next.xp += score.xp;
    next.streak = score.streakAfter;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
    next.answers[scenario.id] = {
      action, outcome, correct, points: score.points, seconds: Math.round(seconds * 10) / 10, at
    };
  }

  next.history.push({ scenarioId: scenario.id, action, outcome, correct, points: score.points, seconds, at, replay: !firstAttempt });
  if (next.history.length > HISTORY_LIMIT) next.history.splice(0, next.history.length - HISTORY_LIMIT);

  // Neue Badges ermitteln
  const newBadges = [];
  for (const id of earnedBadgeIds(next, allScenarios)) {
    if (!next.badges[id]) {
      next.badges[id] = at;
      newBadges.push(id);
    }
  }

  const levelAfter = levelFromXp(next.xp);
  return {
    progress: next,
    result: {
      outcome, correct, firstAttempt, ...score,
      newBadges, levelUp: levelAfter > levelBefore ? levelAfter : null
    }
  };
}

/** Kennzahlen für Statistik-Ansicht. */
export function computeStats(progress, scenarios) {
  const byId = new Map(scenarios.map((s) => [s.id, s]));
  const groups = { difficulty: {}, category: {}, channel: {} };
  let answered = 0, correct = 0, falsePositives = 0, missed = 0, compromised = 0, totalSeconds = 0;

  for (const [id, a] of Object.entries(progress.answers)) {
    const s = byId.get(id);
    if (!s) continue; // Szenario wurde entfernt
    answered++;
    totalSeconds += a.seconds || 0;
    if (a.correct) correct++;
    if (a.outcome === 'false-positive') falsePositives++;
    if (a.outcome === 'missed') missed++;
    if (a.outcome === 'compromised') compromised++;
    for (const key of ['difficulty', 'category', 'channel']) {
      const g = (groups[key][s[key]] ??= { answered: 0, correct: 0 });
      g.answered++;
      if (a.correct) g.correct++;
    }
  }

  return {
    total: scenarios.length,
    answered,
    correct,
    accuracy: answered ? correct / answered : 0,
    falsePositives,
    missed,
    compromised,
    avgSeconds: answered ? totalSeconds / answered : 0,
    groups
  };
}

// --- Export / Import --------------------------------------------------------

export function exportProgress(progress) {
  return JSON.stringify({ app: 'phishguard', exportedAt: new Date().toISOString(), progress }, null, 2);
}

/** Prüft eine importierte Datei defensiv und liefert einen bereinigten Fortschritt. */
export function importProgress(json) {
  let data;
  try {
    data = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    throw new Error('import.invalidJson');
  }
  const p = data?.progress;
  if (data?.app !== 'phishguard' || !p || typeof p !== 'object') throw new Error('import.notPhishguard');
  if (p.version !== PROGRESS_VERSION) throw new Error('import.wrongVersion');

  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
  const clean = createProgress(String(p.profileId || 'import'), String(p.name || 'Import').slice(0, 40));
  clean.createdAt = typeof p.createdAt === 'string' ? p.createdAt : clean.createdAt;
  clean.xp = num(p.xp);
  clean.score = num(p.score);
  clean.streak = num(p.streak);
  clean.bestStreak = num(p.bestStreak);
  clean.answers = p.answers && typeof p.answers === 'object' && !Array.isArray(p.answers) ? p.answers : {};
  clean.history = Array.isArray(p.history) ? p.history.slice(-HISTORY_LIMIT) : [];
  clean.badges = p.badges && typeof p.badges === 'object' && !Array.isArray(p.badges) ? p.badges : {};
  return clean;
}

// --- Persistenz -------------------------------------------------------------

/** Verwaltet mehrere lokale Profile und deren Fortschritt. */
export class ProgressRepository {
  /** @param {import('./storage.js').StorageAdapter} storage */
  constructor(storage) {
    this.storage = storage;
  }

  async listProfiles() {
    return (await this.storage.get('profiles')) ?? [];
  }

  async activeProfileId() {
    return this.storage.get('activeProfile');
  }

  async createProfile(name) {
    const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const profiles = await this.listProfiles();
    profiles.push({ id, name });
    await this.storage.set('profiles', profiles);
    await this.storage.set(`progress:${id}`, createProgress(id, name));
    await this.storage.set('activeProfile', id);
    return id;
  }

  async switchProfile(id) {
    await this.storage.set('activeProfile', id);
  }

  async deleteProfile(id) {
    const profiles = (await this.listProfiles()).filter((p) => p.id !== id);
    await this.storage.set('profiles', profiles);
    await this.storage.remove(`progress:${id}`);
    if ((await this.activeProfileId()) === id) {
      if (profiles[0]) await this.storage.set('activeProfile', profiles[0].id);
      else await this.storage.remove('activeProfile');
    }
  }

  async load(id) {
    return this.storage.get(`progress:${id}`);
  }

  async save(progress) {
    await this.storage.set(`progress:${progress.profileId}`, progress);
  }

  /** Importierten Fortschritt als neues oder bestehendes Profil übernehmen. */
  async importAsProfile(progress) {
    const profiles = await this.listProfiles();
    if (!profiles.some((p) => p.id === progress.profileId)) {
      profiles.push({ id: progress.profileId, name: progress.name });
      await this.storage.set('profiles', profiles);
    }
    await this.save(progress);
    await this.switchProfile(progress.profileId);
  }
}
