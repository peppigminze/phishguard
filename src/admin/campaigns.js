/**
 * Kampagnen-Verwaltung (Trainer-Ansicht).
 * Kennt nur das MailTransport-Interface – welcher Transport dahinter steckt,
 * entscheidet die App beim Start (hier immer MockTransport).
 */
import { DEPARTMENTS } from './recipients.js';

export const EVENT_TYPES = ['sent', 'opened', 'clicked', 'submitted', 'reported'];

export class CampaignService {
  /**
   * @param {import('../core/storage.js').StorageAdapter} storage
   * @param {import('./transport.js').MailTransport} transport
   */
  constructor(storage, transport) {
    this.storage = storage;
    this.transport = transport;
  }

  async list() {
    return (await this.storage.get('campaigns')) ?? [];
  }

  async get(id) {
    return (await this.list()).find((c) => c.id === id) ?? null;
  }

  async create({ name, scenarioId, recipients, trained = false }) {
    if (!name?.trim()) throw new Error('campaign.nameRequired');
    if (!scenarioId) throw new Error('campaign.scenarioRequired');
    if (!recipients?.length) throw new Error('campaign.recipientsRequired');
    const campaign = {
      id: `k-${Date.now().toString(36)}`,
      name: name.trim().slice(0, 80),
      scenarioId,
      recipients,
      trained,
      status: 'draft',
      createdAt: new Date().toISOString(),
      startedAt: null
    };
    const all = await this.list();
    all.unshift(campaign);
    await this.storage.set('campaigns', all);
    return campaign;
  }

  /** "Versand" über den Transport. Beim Mock passiert nichts ausserhalb des Browsers. */
  async start(id, scenario) {
    const all = await this.list();
    const c = all.find((x) => x.id === id);
    if (!c) throw new Error('campaign.notFound');
    if (c.status !== 'draft') return c;
    for (const recipient of c.recipients) {
      await this.transport.send({
        campaignId: c.id,
        recipient,
        scenario: { id: scenario.id, difficulty: scenario.difficulty, subject: scenario.subject, isPhishing: scenario.isPhishing },
        trained: c.trained
      });
    }
    c.status = 'done';
    c.startedAt = new Date().toISOString();
    await this.storage.set('campaigns', all);
    return c;
  }

  async remove(id) {
    await this.storage.set('campaigns', (await this.list()).filter((c) => c.id !== id));
    await this.storage.remove(`events:${id}`);
    await this.storage.remove(`outbox:${id}`);
  }

  async report(id) {
    const c = await this.get(id);
    if (!c) throw new Error('campaign.notFound');
    return computeReport(c, await this.transport.fetchEvents(id));
  }
}

/**
 * Aggregiert Transport-Ereignisse zu Kennzahlen, Abteilungsvergleich und Zeitverlauf.
 * Pure Funktion.
 */
export function computeReport(campaign, events, { hours = 72, bucketHours = 4 } = {}) {
  const per = new Map(campaign.recipients.map((r) => [r.id, new Set()]));
  const firstMinute = {};
  for (const e of events) {
    if (!per.has(e.recipientId)) continue;
    per.get(e.recipientId).add(e.type);
    const key = `${e.recipientId}:${e.type}`;
    firstMinute[key] = Math.min(firstMinute[key] ?? Infinity, e.minute);
  }

  const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0]));
  for (const set of per.values()) for (const t of set) counts[t]++;
  const sent = counts.sent || 0;
  const rate = (n) => (sent ? n / sent : 0);

  // Abteilungen
  const departments = DEPARTMENTS.map((d) => {
    const members = campaign.recipients.filter((r) => r.department === d.id);
    const c = Object.fromEntries(EVENT_TYPES.map((t) => [t, members.filter((m) => per.get(m.id)?.has(t)).length]));
    return { id: d.id, label: d.label, size: members.length, ...c };
  }).filter((d) => d.size > 0);

  // Zeitverlauf (kumuliert)
  const buckets = [];
  for (let h = bucketHours; h <= hours; h += bucketHours) {
    const limit = h * 60;
    const at = (type) => Object.entries(firstMinute).filter(([k, m]) => k.endsWith(`:${type}`) && m <= limit).length;
    buckets.push({ hour: h, opened: at('opened'), clicked: at('clicked'), reported: at('reported') });
  }

  // Median-Zeit bis zur ersten Meldung
  const reportTimes = Object.entries(firstMinute).filter(([k]) => k.endsWith(':reported')).map(([, m]) => m).sort((a, b) => a - b);
  const medianReportMinutes = reportTimes.length
    ? (reportTimes.length % 2
        ? reportTimes[(reportTimes.length - 1) / 2]
        : (reportTimes[reportTimes.length / 2 - 1] + reportTimes[reportTimes.length / 2]) / 2)
    : null;

  return {
    counts,
    rates: {
      opened: rate(counts.opened),
      clicked: rate(counts.clicked),
      submitted: rate(counts.submitted),
      reported: rate(counts.reported)
    },
    departments,
    timeline: buckets,
    medianReportMinutes
  };
}
