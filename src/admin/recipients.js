/**
 * Erzeugt fiktive Empfängerlisten für die Kampagnen-Simulation.
 * Alle Adressen liegen unter der reservierten Domain muster-ag.example.
 */
import { createRng, pick } from '../core/random.js';

const FIRST = ['Lena', 'Noah', 'Mia', 'Luca', 'Elena', 'Jonas', 'Alina', 'Leon', 'Sara', 'Nico', 'Laura', 'Gian', 'Selina', 'Marco', 'Nora', 'Fabio', 'Chiara', 'Dario', 'Jana', 'Levin', 'Ramona', 'Urs', 'Heidi', 'Beat', 'Corinne', 'Reto', 'Priska', 'Andrin', 'Aylin', 'Mirco'];
const LAST = ['Meier', 'Müller', 'Keller', 'Brunner', 'Frei', 'Schmid', 'Baumann', 'Gerber', 'Steiner', 'Zimmermann', 'Huber', 'Fischer', 'Graf', 'Wyss', 'Bühler', 'Kaufmann', 'Hofer', 'Lüthi', 'Rossi', 'Bernasconi', 'Frey', 'Moser', 'Widmer', 'Suter'];

/** Abteilungen mit typischer Grund-Awareness (fiktiv, nur für die Simulation). */
export const DEPARTMENTS = [
  { id: 'gl', label: 'Geschäftsleitung', awareness: 0.45 },
  { id: 'fin', label: 'Finanzen', awareness: 0.5 },
  { id: 'hr', label: 'Personal', awareness: 0.4 },
  { id: 'it', label: 'Informatik', awareness: 0.75 },
  { id: 'sales', label: 'Verkauf', awareness: 0.3 },
  { id: 'prod', label: 'Produktion', awareness: 0.25 },
  { id: 'log', label: 'Logistik', awareness: 0.3 }
];

const slug = (s) => s.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
  .replace(/[^a-z]/g, '');

export function generateRecipients(count = 25, seed = 'muster-ag') {
  const rng = createRng(`recipients|${seed}`);
  const used = new Set();
  const list = [];
  let guard = 0;
  while (list.length < count && guard++ < count * 20) {
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST);
    const email = `${slug(first)}.${slug(last)}@muster-ag.example`;
    if (used.has(email)) continue;
    used.add(email);
    const dept = pick(rng, DEPARTMENTS);
    const jitter = (rng() - 0.5) * 0.3;
    list.push({
      id: `r${list.length + 1}`,
      name: `${first} ${last}`,
      email,
      department: dept.id,
      awareness: Math.round(Math.min(1, Math.max(0, dept.awareness + jitter)) * 100) / 100
    });
  }
  return list;
}

/** Parst eine eingefügte CSV-ähnliche Liste "Name; E-Mail; Abteilung". Nur .example/.invalid erlaubt. */
export function parseRecipientList(text) {
  const out = [];
  const errors = [];
  text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const [name, email, dept = 'sales'] = line.split(/[;,\t]/).map((x) => x.trim());
    const domain = (email || '').split('@')[1] || '';
    if (!name || !email || !email.includes('@')) { errors.push({ line: i + 1, reason: 'format' }); return; }
    if (!/\.(example|invalid)$/i.test(domain)) { errors.push({ line: i + 1, reason: 'domain' }); return; }
    const d = DEPARTMENTS.find((x) => x.id === dept || x.label.toLowerCase() === dept.toLowerCase()) ?? DEPARTMENTS[4];
    out.push({ id: `c${i + 1}`, name, email, department: d.id, awareness: d.awareness });
  });
  return { recipients: out, errors };
}
