import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorageAdapter } from '../src/core/storage.js';
import { MailTransport, MockTransport, simulateReaction } from '../src/admin/transport.js';
import { CampaignService, computeReport } from '../src/admin/campaigns.js';
import { generateRecipients, parseRecipientList } from '../src/admin/recipients.js';
import { createRng } from '../src/core/random.js';

// Sicherheitsnetz: Der Mock darf niemals Netzwerk verwenden.
const realFetch = globalThis.fetch;
before(() => { globalThis.fetch = () => { throw new Error('Netzwerkzugriff im Mock verboten'); }; });
after(() => { globalThis.fetch = realFetch; });

const scenario = { id: 'postis-zollgebuehr', difficulty: 'easy', subject: 'Test', isPhishing: true };

test('MailTransport ist abstrakt', async () => {
  await assert.rejects(() => new MailTransport().send({}));
  await assert.rejects(() => new MailTransport().fetchEvents('x'));
});

test('Empfänger: reservierte Domain, eindeutig, deterministisch', () => {
  const a = generateRecipients(40, 's');
  const b = generateRecipients(40, 's');
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((r) => r.email)).size, a.length);
  for (const r of a) assert.match(r.email, /@muster-ag\.example$/);
});

test('Eingefügte Liste akzeptiert nur .example/.invalid', () => {
  const { recipients, errors } = parseRecipientList('Max; max@firma.example; Verkauf\nEva; eva@firma.ch; HR\nkaputt');
  assert.equal(recipients.length, 1);
  assert.equal(errors.length, 2);
});

test('simulateReaction: Ereignisse sind konsistent', () => {
  const rng = createRng('x');
  for (let i = 0; i < 200; i++) {
    const evs = simulateReaction({ campaignId: 'c', recipient: { id: `r${i}`, awareness: 0.4 }, scenario, trained: false }, rng);
    const types = evs.map((e) => e.type);
    assert.equal(types[0], 'sent');
    if (types.includes('clicked') || types.includes('reported')) assert.ok(types.includes('opened'));
    if (types.includes('submitted')) assert.ok(types.includes('clicked'));
    for (const e of evs) assert.ok(e.minute >= 0 && e.minute <= 72 * 60 + 120);
  }
});

test('Training senkt simulierte Klickrate', () => {
  const rate = (trained) => {
    const rng = createRng('training');
    let clicks = 0;
    for (let i = 0; i < 2000; i++) {
      const evs = simulateReaction({ campaignId: 'c', recipient: { id: `r${i}`, awareness: 0.3 }, scenario: { ...scenario, difficulty: 'hard' }, trained }, rng);
      if (evs.some((e) => e.type === 'clicked')) clicks++;
    }
    return clicks / 2000;
  };
  assert.ok(rate(true) < rate(false));
});

test('CampaignService: anlegen, starten, Bericht (ohne Netzwerk)', async () => {
  const storage = new MemoryStorageAdapter();
  const service = new CampaignService(storage, new MockTransport(storage, { seed: 'test' }));
  await assert.rejects(() => service.create({ name: '', scenarioId: 'x', recipients: [1] }), /nameRequired/);
  const recipients = generateRecipients(30, 'c');
  const c = await service.create({ name: 'Q4', scenarioId: scenario.id, recipients });
  assert.equal(c.status, 'draft');
  await service.start(c.id, scenario);
  const rep = await service.report(c.id);
  assert.equal(rep.counts.sent, 30);
  assert.ok(rep.counts.opened <= 30);
  assert.ok(rep.counts.clicked <= rep.counts.opened);
  assert.equal(rep.timeline.at(-1).hour, 72);
  assert.equal((await storage.get(`outbox:${c.id}`)).length, 30);
  assert.ok((await storage.get(`outbox:${c.id}`)).every((m) => m.simulated));
  // Erneutes Starten verschickt nicht doppelt
  await service.start(c.id, scenario);
  assert.equal((await storage.get(`outbox:${c.id}`)).length, 30);
  await service.remove(c.id);
  assert.equal((await service.list()).length, 0);
  assert.equal(await storage.get(`events:${c.id}`), null);
});

test('computeReport: Raten, Abteilungen, Median', () => {
  const campaign = { recipients: [{ id: 'a', department: 'it' }, { id: 'b', department: 'it' }, { id: 'c', department: 'hr' }] };
  const ev = (recipientId, type, minute) => ({ recipientId, type, minute });
  const rep = computeReport(campaign, [
    ev('a', 'sent', 0), ev('b', 'sent', 0), ev('c', 'sent', 0),
    ev('a', 'opened', 10), ev('a', 'reported', 20),
    ev('b', 'opened', 30), ev('b', 'clicked', 31), ev('b', 'reported', 40),
    ev('x', 'opened', 5) // unbekannter Empfänger wird ignoriert
  ]);
  assert.equal(rep.counts.sent, 3);
  assert.equal(rep.counts.opened, 2);
  assert.equal(rep.rates.clicked, 1 / 3);
  assert.equal(rep.medianReportMinutes, 30);
  assert.equal(rep.departments.find((d) => d.id === 'it').reported, 2);
  assert.equal(rep.timeline[0].opened, 2);
});
