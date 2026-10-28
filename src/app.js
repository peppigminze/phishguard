/**
 * Zentraler App-Kontext: hält geladene Daten, aktives Profil und Services.
 * Views bekommen diesen Kontext und rufen nur seine Methoden auf –
 * so bleiben Persistenz und Transport austauschbar.
 */
import { createDefaultStorage } from './core/storage.js';
import { ProgressRepository, applyDecision } from './core/progress.js';
import { loadScenarios, buildSession } from './core/scenarios.js';
import { MockTransport } from './admin/transport.js';
import { CampaignService } from './admin/campaigns.js';

export async function createApp() {
  const storage = createDefaultStorage();
  const repo = new ProgressRepository(storage);
  // Hier würde später ein echter Transport injiziert – bewusst nur der Mock.
  const transport = new MockTransport(storage);
  const campaigns = new CampaignService(storage, transport);

  const [scenarios, lexicon] = await Promise.all([
    loadScenarios('./data/scenarios/'),
    fetch('./data/lexicon/de.json').then((r) => r.json())
  ]);
  const byId = new Map(scenarios.map((s) => [s.id, s]));

  const listeners = new Set();
  const app = {
    storage, repo, transport, campaigns, scenarios, lexicon, byId,
    progress: null,
    profiles: [],
    session: null,

    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { listeners.forEach((fn) => fn(app)); },

    async loadActiveProfile() {
      app.profiles = await repo.listProfiles();
      const id = await repo.activeProfileId();
      app.progress = id ? await repo.load(id) : null;
      if (!app.progress && app.profiles[0]) {
        await repo.switchProfile(app.profiles[0].id);
        app.progress = await repo.load(app.profiles[0].id);
      }
      app.session = null;
      app.emit();
    },

    async createProfile(name) {
      await repo.createProfile(name.trim().slice(0, 40) || 'Ich');
      await app.loadActiveProfile();
    },

    async switchProfile(id) {
      await repo.switchProfile(id);
      await app.loadActiveProfile();
    },

    async deleteProfile(id) {
      await repo.deleteProfile(id);
      await app.loadActiveProfile();
    },

    /** Neue Trainingsrunde. */
    startSession({ difficulty = 'all', onlyOpen = false } = {}) {
      const list = buildSession(scenarios, { difficulty, onlyOpen, answers: app.progress?.answers ?? {}, size: 8 });
      app.session = {
        difficulty,
        ids: list.map((s) => s.id),
        currentId: null,
        timers: {}, // id -> { acc: ms, since: ms|null }
        results: {} // id -> result aus applyDecision
      };
      return app.session;
    },

    /** Entscheidung anwenden und speichern. */
    async decide(scenarioId, action, seconds) {
      const scenario = byId.get(scenarioId);
      const { progress, result } = applyDecision(app.progress, scenario, action, seconds, scenarios);
      app.progress = progress;
      await repo.save(progress);
      if (app.session) app.session.results[scenarioId] = { ...result, action, seconds };
      app.emit();
      return result;
    }
  };

  await app.loadActiveProfile();
  return app;
}
