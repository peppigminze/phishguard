/**
 * Versand-Schnittstelle für Kampagnen.
 *
 * Die Admin-Ansicht und der CampaignService kennen nur dieses Interface.
 * In diesem Projekt gibt es bewusst NUR den MockTransport: er verschickt
 * nichts, sondern schreibt in den StorageAdapter und simuliert Reaktionen.
 *
 * Ein echter Transport (z. B. SMTP-Relay über ein eigenes Backend) müsste
 * nur `send()` und `fetchEvents()` implementieren – siehe docs/adr/0003-mail-transport.md.
 * Er ist absichtlich NICHT implementiert.
 */
import { createRng } from '../core/random.js';

/** @typedef {{ campaignId:string, recipient:{id:string,email:string,department:string,awareness:number}, scenario:{id:string,difficulty:string,subject?:string,isPhishing:boolean}, trained:boolean }} OutgoingMessage */
/** @typedef {{ campaignId:string, recipientId:string, type:'sent'|'opened'|'clicked'|'submitted'|'reported', minute:number }} TransportEvent */

export class MailTransport {
  /** Anzeigename für die UI. */
  get label() { return 'abstract'; }
  /** true, wenn nichts wirklich versendet wird. */
  get isSimulation() { return true; }
  /** @param {OutgoingMessage} _message @returns {Promise<{messageId:string}>} */
  async send(_message) { throw new Error('not implemented'); }
  /** @param {string} _campaignId @returns {Promise<TransportEvent[]>} */
  async fetchEvents(_campaignId) { throw new Error('not implemented'); }
}

/** Reaktionswahrscheinlichkeiten nach Schwierigkeit des Szenarios. */
export const SIM_PROFILE = Object.freeze({
  easy: { open: 0.62, click: 0.18, submit: 0.35, report: 0.42 },
  medium: { open: 0.7, click: 0.3, submit: 0.45, report: 0.3 },
  hard: { open: 0.78, click: 0.44, submit: 0.55, report: 0.18 }
});
const SIM_WINDOW_MINUTES = 72 * 60;

/**
 * Simuliert, wie eine Person auf eine Kampagnen-Mail reagiert.
 * Pure Funktion (bis auf den übergebenen RNG) – deshalb separat testbar.
 * @returns {TransportEvent[]}
 */
export function simulateReaction(message, rng) {
  const { campaignId, recipient, scenario, trained } = message;
  const profile = SIM_PROFILE[scenario.difficulty] ?? SIM_PROFILE.medium;
  // Awareness 0..1; ein absolviertes Training erhöht sie spürbar.
  const awareness = Math.min(1, (recipient.awareness ?? 0.4) + (trained ? 0.3 : 0));
  const ev = (type, minute) => ({ campaignId, recipientId: recipient.id, type, minute: Math.round(minute) });
  const events = [ev('sent', 0)];

  if (rng() > profile.open) return events;
  // Öffnen: meist in den ersten Arbeitsstunden, Long-Tail über 72 h
  const openAt = Math.min(SIM_WINDOW_MINUTES - 60, -Math.log(1 - rng() * 0.98) * 240 + 5);
  events.push(ev('opened', openAt));

  const pReport = Math.min(0.95, profile.report + awareness * 0.45);
  const pClick = Math.max(0.02, profile.click * (1 - awareness * 0.75));

  const clicks = rng() < pClick;
  if (clicks) {
    const clickAt = openAt + 1 + rng() * 20;
    events.push(ev('clicked', clickAt));
    if (rng() < profile.submit * (1 - awareness * 0.5)) events.push(ev('submitted', clickAt + 1 + rng() * 4));
    // Manche merken es nach dem Klick und melden trotzdem – das ist gut!
    if (rng() < pReport * 0.4) events.push(ev('reported', clickAt + 5 + rng() * 60));
  } else if (rng() < pReport) {
    events.push(ev('reported', openAt + 1 + rng() * 30));
  }
  return events;
}

/** Simulierter Versand – schreibt nur in den Storage. */
export class MockTransport extends MailTransport {
  /** @param {import('../core/storage.js').StorageAdapter} storage */
  constructor(storage, { seed = 'phishguard' } = {}) {
    super();
    this.storage = storage;
    this.seed = seed;
  }

  get label() { return 'Mock (localStorage)'; }
  get isSimulation() { return true; }

  async send(message) {
    const messageId = `${message.campaignId}:${message.recipient.id}`;
    const outboxKey = `outbox:${message.campaignId}`;
    const eventsKey = `events:${message.campaignId}`;

    const outbox = (await this.storage.get(outboxKey)) ?? [];
    outbox.push({
      messageId,
      to: message.recipient.email,
      scenarioId: message.scenario.id,
      subject: message.scenario.subject ?? '(ohne Betreff)',
      queuedAt: new Date().toISOString(),
      simulated: true
    });
    await this.storage.set(outboxKey, outbox);

    // Pro Nachricht eigener, deterministischer RNG
    const rng = createRng(`${this.seed}|${messageId}`);
    const events = (await this.storage.get(eventsKey)) ?? [];
    events.push(...simulateReaction(message, rng));
    await this.storage.set(eventsKey, events);

    return { messageId };
  }

  async fetchEvents(campaignId) {
    return (await this.storage.get(`events:${campaignId}`)) ?? [];
  }
}
