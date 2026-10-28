/**
 * Badges – deklarativ definiert. Jede Regel ist eine pure Funktion
 * (progress, scenarios) => boolean. Texte liegen in der i18n-Datei
 * unter badges.<id>.title / badges.<id>.desc.
 */
import { levelFromXp, OUTCOMES } from './scoring.js';

const firstAnswers = (progress) => Object.values(progress.answers ?? {});
const answerOf = (progress, id) => progress.answers?.[id];

/** Wurden alle Szenarien, die `filter` erfüllen, im ersten Versuch korrekt gelöst? */
function allCorrect(progress, scenarios, filter) {
  const subset = scenarios.filter(filter);
  return subset.length > 0 && subset.every((s) => answerOf(progress, s.id)?.correct === true);
}

export const BADGES = [
  { id: 'erster-fang', icon: '🎣', test: (p) => firstAnswers(p).some((a) => a.outcome === OUTCOMES.CAUGHT) },
  { id: 'serie-5', icon: '🔥', test: (p) => (p.bestStreak ?? 0) >= 5 },
  { id: 'serie-10', icon: '⚡', test: (p) => (p.bestStreak ?? 0) >= 10 },
  {
    id: 'blitzmerker',
    icon: '⏱️',
    test: (p) => firstAnswers(p).filter((a) => a.correct && a.seconds >= 2 && a.seconds <= 10).length >= 5
  },
  { id: 'vertrauen', icon: '🤝', test: (p) => firstAnswers(p).filter((a) => a.outcome === OUTCOMES.TRUSTED).length >= 5 },
  { id: 'kein-fehlalarm', icon: '🎯', test: (p, sc) => allCorrect(p, sc, (s) => !s.isPhishing) },
  { id: 'quishing-profi', icon: '🔳', test: (p, sc) => allCorrect(p, sc, (s) => s.category === 'quishing') },
  { id: 'smishing-profi', icon: '📱', test: (p, sc) => allCorrect(p, sc, (s) => s.channel === 'sms') },
  { id: 'vishing-profi', icon: '☎️', test: (p, sc) => allCorrect(p, sc, (s) => s.channel === 'voice') },
  { id: 'leicht-perfekt', icon: '🥉', test: (p, sc) => allCorrect(p, sc, (s) => s.difficulty === 'easy') },
  { id: 'mittel-perfekt', icon: '🥈', test: (p, sc) => allCorrect(p, sc, (s) => s.difficulty === 'medium') },
  { id: 'schwer-perfekt', icon: '🥇', test: (p, sc) => allCorrect(p, sc, (s) => s.difficulty === 'hard') },
  { id: 'komplett', icon: '🏁', test: (p, sc) => sc.length > 0 && sc.every((s) => answerOf(p, s.id)) },
  { id: 'level-5', icon: '🛡️', test: (p) => levelFromXp(p.xp ?? 0) >= 5 }
];

/** Liefert die IDs aller Badges, die aktuell erfüllt sind. */
export function earnedBadgeIds(progress, scenarios) {
  return BADGES.filter((b) => b.test(progress, scenarios)).map((b) => b.id);
}
