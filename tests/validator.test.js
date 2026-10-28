import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateScenario, isSafeHostname, parseBody } from '../src/core/validator.js';

const base = () => ({
  id: 'test-szenario', schemaVersion: 1, channel: 'email', difficulty: 'easy', category: 'paket',
  isPhishing: true, title: 'Test', subject: 'Betreff', received: '08:00',
  sender: { name: 'Absender', address: 'a@fake.invalid' },
  body: 'Hallo {{flag:eile|sofort}} {{link:l1|hier}}',
  links: [{ id: 'l1', url: 'https://fake.invalid/x', indicator: 'link' }],
  indicators: [
    { id: 'eile', type: 'urgency', target: 'body', title: 'Eile', explanation: 'Zeitdruck' },
    { id: 'link', type: 'link', target: 'link', title: 'Link', explanation: 'Fremde Domain' }
  ],
  explanation: 'Eine ausreichend lange Erklärung für den Test.'
});

test('gültiges Szenario wird akzeptiert', () => {
  const r = validateScenario(base());
  assert.equal(r.valid, true, r.errors.join('\n'));
});

test('isSafeHostname erlaubt nur reservierte Domains', () => {
  for (const h of ['x.invalid', 'a.b.example', 'example.com', 'mail.example.org', 'foo.test']) assert.ok(isSafeHostname(h), h);
  for (const h of ['post.ch', 'example.com.evil.ch', 'invalid.ch', 'notexample.com']) assert.ok(!isSafeHostname(h), h);
});

test('echte Domains im Link werden abgelehnt', () => {
  const s = base();
  s.links[0].url = 'https://www.post.ch/login';
  assert.match(validateScenario(s).errors.join(), /nicht reserviert/);
});

test('echte Absenderdomain wird abgelehnt', () => {
  const s = base();
  s.sender.address = 'info@bank.ch';
  assert.equal(validateScenario(s).valid, false);
});

test('nackte URL im Body wird geprüft', () => {
  const s = base();
  s.body += ' https://evil.ch/x';
  assert.match(validateScenario(s).errors.join(), /nicht reservierte URL/);
});

test('Markup-Verweise müssen existieren', () => {
  const s = base();
  s.body = 'Hallo {{flag:gibtsnicht|x}} {{link:l1|hier}}';
  const errors = validateScenario(s).errors.join('\n');
  assert.match(errors, /unbekannten Indikator/);
  assert.match(errors, /target body\) kommt im Body nicht vor/);
});

test('kaputtes Markup wird erkannt', () => {
  const s = base();
  s.body += ' {{flag:eile}';
  assert.match(validateScenario(s).errors.join(), /fehlerhaftes Markup/);
});

test('Phishing braucht mind. 2 Warnsignale', () => {
  const s = base();
  s.body = 'Hallo {{link:l1|hier}}';
  s.indicators = [s.indicators[1]];
  assert.match(validateScenario(s).errors.join(), /mind\. 2 Warnsignale/);
});

test('legitime Szenarien brauchen Echtheitszeichen und keine Warnsignale', () => {
  const s = base();
  s.isPhishing = false;
  const errors = validateScenario(s).errors.join('\n');
  assert.match(errors, /nur Indikatoren vom Typ "legit"/);
  assert.match(errors, /mind\. 1 Indikator vom Typ "legit"/);
});

test('Schweizer Rechtschreibung: ß ist verboten', () => {
  const s = base();
  s.explanation = 'Mit freundlichen Grüßen und genügend langem Text dazu.';
  assert.match(validateScenario(s).errors.join(), /ß/);
});

test('Enums und Pflichtfelder', () => {
  const s = base();
  s.channel = 'fax';
  s.difficulty = 'brutal';
  delete s.subject;
  s.id = 'Nicht Kebab';
  const errors = validateScenario(s).errors.join('\n');
  assert.match(errors, /channel/);
  assert.match(errors, /difficulty/);
  assert.match(errors, /kebab-case/);
});

test('E-Mails brauchen einen Betreff', () => {
  const s = base();
  delete s.subject;
  assert.match(validateScenario(s).errors.join(), /subject/);
});

test('Indikator-Ziele müssen zugeordnet sein (Anhang/QR/Header)', () => {
  const s = base();
  s.indicators.push(
    { id: 'anh', type: 'attachment', target: 'attachment', title: 'A', explanation: 'x' },
    { id: 'q', type: 'qr', target: 'qr', title: 'Q', explanation: 'x' },
    { id: 'h', type: 'headers', target: 'headers', title: 'H', explanation: 'x' }
  );
  const errors = validateScenario(s).errors.join('\n');
  assert.match(errors, /keinem Anhang/);
  assert.match(errors, /keinem QR-Code/);
  assert.match(errors, /braucht headers/);
});

test('parseBody zerlegt Text, Flags und Links', () => {
  assert.deepEqual(parseBody('A {{flag:x|B}} C {{link:y|D}}'), [
    { type: 'text', text: 'A ' },
    { type: 'flag', id: 'x', text: 'B' },
    { type: 'text', text: ' C ' },
    { type: 'link', id: 'y', text: 'D' }
  ]);
});

test('Nicht-Objekte werden abgelehnt', () => {
  assert.equal(validateScenario(null).valid, false);
  assert.equal(validateScenario([]).valid, false);
});

test('loadScenarios: überspringt ungültige, wiederholt fehlgeschlagene Requests', async () => {
  const { loadScenarios } = await import('../src/core/scenarios.js');
  const good = base();
  const calls = {};
  const files = { 'index.json': { files: ['a.json', 'b.json', 'c.json'] }, 'a.json': good, 'b.json': { id: 'kaputt' }, 'c.json': { ...good, id: 'zweites' } };
  const fakeFetch = async (url) => {
    const name = String(url).split('/').pop();
    calls[name] = (calls[name] ?? 0) + 1;
    if (name === 'c.json' && calls[name] === 1) throw new TypeError('Failed to fetch');
    return { ok: true, status: 200, json: async () => structuredClone(files[name]) };
  };
  const warn = console.warn; console.warn = () => {};
  const list = await loadScenarios('http://localhost/data/scenarios/', fakeFetch);
  console.warn = warn;
  assert.deepEqual(list.map((s) => s.id).sort(), ['test-szenario', 'zweites']);
  assert.equal(calls['c.json'], 2);
});
