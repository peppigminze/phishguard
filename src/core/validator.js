/**
 * Szenario-Validierung.
 *
 * Läuft identisch im Browser (Loader verwirft ungültige Szenarien) und in Node
 * (Tests, `npm run validate`, CI). Die formale Beschreibung steht zusätzlich
 * als JSON Schema in docs/scenario.schema.json – dieser Validator prüft darüber
 * hinaus inhaltliche Regeln, die JSON Schema nicht ausdrücken kann
 * (Querverweise im Body-Markup, sichere Domains, Schweizer Rechtschreibung).
 */

export const SCHEMA_VERSION = 1;
export const CHANNELS = ['email', 'sms', 'voice'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const CATEGORIES = [
  'paket', 'bank', 'zahlung', 'behoerde', 'telekom', 'it-login', 'ceo-fraud',
  'rechnung', 'quishing', 'intern', 'gutschein', 'messenger', 'oev',
  'krankenkasse', 'domain'
];
export const INDICATOR_TYPES = [
  'sender', 'urgency', 'grammar', 'link', 'attachment', 'request', 'greeting',
  'headers', 'qr', 'offer', 'authority', 'channel', 'context', 'legit'
];
export const INDICATOR_TARGETS = ['body', 'sender', 'subject', 'headers', 'link', 'attachment', 'qr', 'general'];
export const AUTH_RESULTS = ['pass', 'fail', 'softfail', 'none'];

/** Gefährliche Dateiendungen – nur zur Info für Validierung/Erklärungen. */
export const RISKY_EXTENSIONS = ['exe', 'scr', 'js', 'vbs', 'html', 'htm', 'iso', 'img', 'zip', 'docm', 'xlsm', 'lnk', 'bat', 'cmd'];

/** Body-Markup: {{flag:id|Text}} oder {{link:id|Text}} */
export const MARKUP_RE = /\{\{(flag|link):([a-z0-9-]+)\|([^{}]+)\}\}/g;

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const URL_RE = /\bhttps?:\/\/[^\s"'<>)]+/gi;
const EMAIL_RE = /^[^\s@]+@([^\s@]+)$/;

/**
 * Nur reservierte Domains sind erlaubt (RFC 2606 / RFC 6761),
 * damit nie eine echte Adresse im Szenario-Pack landet.
 */
export function isSafeHostname(hostname) {
  const h = String(hostname).toLowerCase().replace(/\.$/, '');
  return (
    h.endsWith('.invalid') || h === 'invalid' ||
    h.endsWith('.example') || h === 'example' ||
    h.endsWith('.test') ||
    /(^|\.)example\.(com|org|net)$/.test(h)
  );
}

export function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Sammelt alle String-Werte rekursiv (für Rechtschreib-Check). */
function collectStrings(value, path = '$', out = []) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectStrings(v, `${path}.${k}`, out);
  }
  return out;
}

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Validiert ein einzelnes Szenario.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateScenario(s) {
  const errors = [];
  const err = (msg) => errors.push(msg);

  if (!s || typeof s !== 'object' || Array.isArray(s)) {
    return { valid: false, errors: ['Szenario muss ein Objekt sein'] };
  }
  const where = s.id ? `[${s.id}] ` : '';

  // --- Pflichtfelder & Enums ------------------------------------------------
  if (!isNonEmptyString(s.id) || !ID_RE.test(s.id)) err('id fehlt oder ist nicht kebab-case');
  if (s.schemaVersion !== SCHEMA_VERSION) err(`schemaVersion muss ${SCHEMA_VERSION} sein`);
  if (!CHANNELS.includes(s.channel)) err(`channel muss einer von ${CHANNELS.join(', ')} sein`);
  if (!DIFFICULTIES.includes(s.difficulty)) err(`difficulty muss einer von ${DIFFICULTIES.join(', ')} sein`);
  if (!CATEGORIES.includes(s.category)) err(`category "${s.category}" ist unbekannt`);
  if (typeof s.isPhishing !== 'boolean') err('isPhishing muss boolean sein');
  if (!isNonEmptyString(s.title)) err('title fehlt');
  if (!isNonEmptyString(s.body)) err('body fehlt');
  if (!isNonEmptyString(s.explanation) || s.explanation.length < 30) err('explanation fehlt oder ist zu kurz (min. 30 Zeichen)');
  if (s.channel === 'email' && !isNonEmptyString(s.subject)) err('subject ist bei E-Mails Pflicht');
  for (const k of ['situation', 'received', 'recipient', 'locale']) {
    if (s[k] != null && typeof s[k] !== 'string') err(`${k} muss ein String sein`);
  }

  // --- Absender -------------------------------------------------------------
  if (!s.sender || !isNonEmptyString(s.sender.name)) err('sender.name fehlt');
  if (s.channel === 'email') {
    const m = s.sender && typeof s.sender.address === 'string' && s.sender.address.match(EMAIL_RE);
    if (!m) err('sender.address muss bei E-Mails eine Mailadresse sein');
    else if (!isSafeHostname(m[1])) err(`Absenderdomain "${m[1]}" ist nicht reserviert (.invalid/.example)`);
  }

  // --- Header ---------------------------------------------------------------
  if (s.headers != null) {
    if (typeof s.headers !== 'object') err('headers muss ein Objekt sein');
    else {
      for (const k of ['spf', 'dkim', 'dmarc']) {
        if (s.headers[k] != null && !AUTH_RESULTS.includes(s.headers[k])) err(`headers.${k} ungültig`);
      }
      for (const k of ['replyTo', 'returnPath']) {
        if (s.headers[k] != null) {
          const m = String(s.headers[k]).match(EMAIL_RE);
          if (!m) err(`headers.${k} muss eine Mailadresse sein`);
          else if (!isSafeHostname(m[1])) err(`headers.${k}: Domain "${m[1]}" ist nicht reserviert`);
        }
      }
    }
  }

  // --- Indikatoren ----------------------------------------------------------
  const indicators = Array.isArray(s.indicators) ? s.indicators : [];
  if (!Array.isArray(s.indicators)) err('indicators muss ein Array sein');
  const indicatorIds = new Set();
  for (const [i, ind] of indicators.entries()) {
    const p = `indicators[${i}]`;
    if (!ind || !isNonEmptyString(ind.id) || !ID_RE.test(ind.id)) { err(`${p}.id fehlt/ungültig`); continue; }
    if (indicatorIds.has(ind.id)) err(`${p}.id "${ind.id}" doppelt`);
    indicatorIds.add(ind.id);
    if (!INDICATOR_TYPES.includes(ind.type)) err(`${p}.type "${ind.type}" unbekannt`);
    if (!INDICATOR_TARGETS.includes(ind.target)) err(`${p}.target "${ind.target}" unbekannt`);
    if (!isNonEmptyString(ind.title)) err(`${p}.title fehlt`);
    if (!isNonEmptyString(ind.explanation)) err(`${p}.explanation fehlt`);
    if (s.isPhishing === false && ind.type !== 'legit' && ind.type !== 'context') {
      err(`${p}: legitime Szenarien dürfen nur Indikatoren vom Typ "legit"/"context" haben`);
    }
  }
  if (s.isPhishing === true) {
    const red = indicators.filter((i) => i.type !== 'legit');
    if (red.length < 2) err('Phishing-Szenarien brauchen mind. 2 Warnsignale');
  } else if (s.isPhishing === false) {
    if (!indicators.some((i) => i.type === 'legit')) err('Legitime Szenarien brauchen mind. 1 Indikator vom Typ "legit"');
  }

  // --- Links ----------------------------------------------------------------
  const links = s.links ?? [];
  if (!Array.isArray(links)) err('links muss ein Array sein');
  const linkIds = new Set();
  for (const [i, l] of (Array.isArray(links) ? links : []).entries()) {
    const p = `links[${i}]`;
    if (!l || !isNonEmptyString(l.id)) { err(`${p}.id fehlt`); continue; }
    if (linkIds.has(l.id)) err(`${p}.id "${l.id}" doppelt`);
    linkIds.add(l.id);
    const host = hostnameOf(l.url);
    if (!host) err(`${p}.url ist keine gültige URL`);
    else if (!isSafeHostname(host)) err(`${p}.url: Domain "${host}" ist nicht reserviert`);
    if (l.indicator != null && !indicatorIds.has(l.indicator)) err(`${p}.indicator verweist auf unbekannten Indikator "${l.indicator}"`);
  }

  // --- Anhänge --------------------------------------------------------------
  const attachments = s.attachments ?? [];
  if (!Array.isArray(attachments)) err('attachments muss ein Array sein');
  for (const [i, a] of (Array.isArray(attachments) ? attachments : []).entries()) {
    const p = `attachments[${i}]`;
    if (!a || !isNonEmptyString(a.name)) err(`${p}.name fehlt`);
    if (a && !isNonEmptyString(a.size)) err(`${p}.size fehlt`);
    if (a && a.indicator != null && !indicatorIds.has(a.indicator)) err(`${p}.indicator verweist auf unbekannten Indikator "${a.indicator}"`);
  }

  // --- QR-Code --------------------------------------------------------------
  if (s.qr != null) {
    const host = hostnameOf(s.qr.url);
    if (!host) err('qr.url ist keine gültige URL');
    else if (!isSafeHostname(host)) err(`qr.url: Domain "${host}" ist nicht reserviert`);
    if (s.qr.indicator != null && !indicatorIds.has(s.qr.indicator)) err('qr.indicator verweist auf unbekannten Indikator');
  }

  // --- Body-Markup ----------------------------------------------------------
  if (isNonEmptyString(s.body)) {
    const usedFlags = new Set();
    const usedLinks = new Set();
    for (const [, kind, id] of s.body.matchAll(MARKUP_RE)) {
      if (kind === 'flag') {
        if (!indicatorIds.has(id)) err(`Body: {{flag:${id}}} verweist auf unbekannten Indikator`);
        usedFlags.add(id);
      } else {
        if (!linkIds.has(id)) err(`Body: {{link:${id}}} verweist auf unbekannten Link`);
        usedLinks.add(id);
      }
    }
    const stripped = s.body.replace(MARKUP_RE, '');
    if (stripped.includes('{{') || stripped.includes('}}')) err('Body enthält fehlerhaftes Markup ({{ … }})');
    for (const id of linkIds) if (!usedLinks.has(id)) err(`Link "${id}" wird im Body nicht verwendet`);
    for (const ind of indicators) {
      if (ind.target === 'body' && !usedFlags.has(ind.id)) err(`Indikator "${ind.id}" (target body) kommt im Body nicht vor`);
      if (ind.target === 'link' && !links.some((l) => l.indicator === ind.id)) err(`Indikator "${ind.id}" (target link) ist keinem Link zugeordnet`);
      if (ind.target === 'attachment' && !attachments.some((a) => a.indicator === ind.id)) err(`Indikator "${ind.id}" (target attachment) ist keinem Anhang zugeordnet`);
      if (ind.target === 'qr' && !(s.qr && s.qr.indicator === ind.id)) err(`Indikator "${ind.id}" (target qr) ist keinem QR-Code zugeordnet`);
      if (ind.target === 'headers' && !s.headers) err(`Indikator "${ind.id}" (target headers) braucht headers`);
    }
    // Keine "nackten" URLs im Text, die nicht reserviert sind
    for (const [url] of s.body.matchAll(URL_RE)) {
      const host = hostnameOf(url);
      if (!host || !isSafeHostname(host)) err(`Body enthält nicht reservierte URL "${url}"`);
    }
  }

  // --- Schweizer Rechtschreibung -------------------------------------------
  for (const [path, str] of collectStrings(s)) {
    if (str.includes('ß')) err(`${path} enthält "ß" (Schweizer Rechtschreibung: "ss")`);
  }

  return { valid: errors.length === 0, errors: errors.map((e) => where + e) };
}

/** Validiert ein ganzes Pack und prüft eindeutige IDs. */
export function validatePack(scenarios) {
  const errors = [];
  const seen = new Set();
  for (const s of scenarios) {
    const r = validateScenario(s);
    errors.push(...r.errors);
    if (s && s.id) {
      if (seen.has(s.id)) errors.push(`Doppelte Szenario-ID "${s.id}"`);
      seen.add(s.id);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Body in Segmente zerlegen: [{type:'text'|'flag'|'link', id?, text}]
 * Wird von der UI verwendet und ist hier, damit es testbar ist.
 */
export function parseBody(body) {
  const out = [];
  let last = 0;
  for (const m of body.matchAll(MARKUP_RE)) {
    if (m.index > last) out.push({ type: 'text', text: body.slice(last, m.index) });
    out.push({ type: m[1], id: m[2], text: m[3] });
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push({ type: 'text', text: body.slice(last) });
  return out;
}
