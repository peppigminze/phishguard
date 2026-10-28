/**
 * Darstellung eines Szenarios als Mail-Client, SMS-Verlauf oder Anrufprotokoll.
 * Vor der Entscheidung wirkt alles wie echt. Mit `revealed: true` werden die
 * Indikatoren nummeriert und farblich markiert (Rot = Warnsignal, Grün = Echtheitszeichen).
 */
import { html, raw } from './dom.js';
import { parseBody } from '../core/validator.js';
import { createRng } from '../core/random.js';
import { t } from '../i18n/i18n.js';

/** Nummerierung der Indikatoren in Reihenfolge des Szenarios. */
export function indicatorNumbers(scenario) {
  return new Map(scenario.indicators.map((ind, i) => [ind.id, i + 1]));
}

function marker(scenario, indId, ctx) {
  if (!ctx.revealed || !indId) return '';
  const n = ctx.numbers.get(indId);
  if (!n) return '';
  const ind = scenario.indicators.find((i) => i.id === indId);
  const tone = ind.type === 'legit' ? 'safe' : 'threat';
  return html`<span class="marker marker--${tone}" aria-hidden="true">${n}</span><span class="sr-only">(Hinweis ${n})</span>`;
}

/** Text + Flags + Links eines Abschnitts. */
function renderSegments(scenario, text, ctx) {
  return parseBody(text).map((seg) => {
    if (seg.type === 'text') return html`${seg.text}`;
    if (seg.type === 'flag') {
      const ind = scenario.indicators.find((i) => i.id === seg.id);
      const tone = ind?.type === 'legit' ? 'safe' : 'threat';
      return html`<span class="flag ${ctx.revealed ? `flag--${tone}` : ''}" data-ind="${seg.id}">${seg.text}${marker(scenario, seg.id, ctx)}</span>`;
    }
    const link = scenario.links.find((l) => l.id === seg.id);
    return html`<button type="button" class="sim-link" data-link="${link.id}" data-url="${link.url}" title="${link.url}" aria-describedby="link-status">${seg.text}</button>${marker(scenario, link.indicator, ctx)}`;
  });
}

const initials = (name) => name.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (['html', 'htm'].includes(ext)) return 'HTM';
  if (['exe', 'scr', 'bat', 'cmd', 'js', 'vbs', 'lnk'].includes(ext)) return 'EXE';
  if (['zip', 'iso', 'img'].includes(ext)) return 'ZIP';
  if (['xlsx', 'xlsm', 'csv'].includes(ext)) return 'XLS';
  return 'DOC';
}

/** Nicht scannbares QR-ähnliches Muster (deterministisch aus der URL). */
export function fakeQrSvg(seed) {
  const n = 25;
  const rng = createRng(`qr|${seed}`);
  const cells = [];
  const finder = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (finder(x, y)) continue;
      if (rng() < 0.47) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  const eye = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" class="qr__svg" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><g fill="#111">${cells.join('')}${eye(0, 0)}${eye(n - 7, 0)}${eye(0, n - 7)}</g></svg>`;
}

function authRow(label, value, ctx) {
  if (!value) return '';
  return html`<span class="auth auth--${value}">${label}: ${t(`train.authResult.${value}`)}</span>`;
}

function renderEmail(s, ctx) {
  const h = s.headers ?? {};
  const headersInd = s.indicators.find((i) => i.target === 'headers');
  const senderInd = s.indicators.find((i) => i.target === 'sender');
  const subjectInd = s.indicators.find((i) => i.target === 'subject');
  const openDetails = ctx.revealed && headersInd;

  return html`
    <article class="mail" aria-labelledby="mail-subject">
      <header class="mail__head">
        <h2 id="mail-subject" class="mail__subject" tabindex="-1">${s.subject}${marker(s, subjectInd?.id, ctx)}</h2>
        <div class="mail__meta">
          <span class="mail__avatar" aria-hidden="true">${initials(s.sender.name)}</span>
          <div class="mail__who">
            <div class="mail__from ${ctx.revealed && senderInd ? `is-marked is-marked--${senderInd.type === 'legit' ? 'safe' : 'threat'}` : ''}">
              <span class="mail__name">${s.sender.name}</span>
              <span class="mail__addr">&lt;${s.sender.address}&gt;</span>${marker(s, senderInd?.id, ctx)}
            </div>
            <div class="mail__to">${t('train.to')}: ${s.recipient}</div>
          </div>
          <span class="mail__date">${s.received ?? ''}</span>
        </div>
        ${s.headers ? html`
          <details class="mail__details" ${openDetails ? raw('open') : ''}>
            <summary>${t('train.showDetails')}</summary>
            <dl class="mail__headers">
              <dt>${t('train.from')}</dt><dd>${s.sender.address}</dd>
              ${h.replyTo ? html`<dt>${t('train.replyTo')}</dt><dd>${h.replyTo}</dd>` : ''}
              ${h.returnPath ? html`<dt>${t('train.returnPath')}</dt><dd>${h.returnPath}</dd>` : ''}
              <dt>${t('train.auth')}</dt>
              <dd class="${ctx.revealed && headersInd ? `is-marked is-marked--${headersInd.type === 'legit' ? 'safe' : 'threat'}` : ''}">
                ${authRow('SPF', h.spf, ctx)} ${authRow('DKIM', h.dkim, ctx)} ${authRow('DMARC', h.dmarc, ctx)}${marker(s, headersInd?.id, ctx)}
              </dd>
            </dl>
          </details>` : ''}
      </header>
      <div class="mail__body">${renderSegments(s, s.body, ctx)}</div>
      ${renderQr(s, ctx)}
      ${renderAttachments(s, ctx)}
      <div class="mail__status" id="link-status" aria-live="polite"></div>
    </article>`;
}

function renderQr(s, ctx) {
  if (!s.qr) return '';
  const marked = ctx.revealed && s.qr.indicator;
  return html`
    <figure class="qr ${marked ? 'is-marked is-marked--threat' : ''}">
      ${raw(fakeQrSvg(s.qr.url))}
      <figcaption>
        <span>${s.qr.caption ?? t('train.qrCaption')}${marker(s, s.qr.indicator, ctx)}</span>
        <details class="qr__peek" ${ctx.revealed ? raw('open') : ''}>
          <summary>${t('train.qrReveal')}</summary>
          <code>${s.qr.url}</code>
        </details>
        <small>${t('train.qrNote')}</small>
      </figcaption>
    </figure>`;
}

function renderAttachments(s, ctx) {
  if (!s.attachments?.length) return '';
  return html`
    <div class="mail__attachments">
      <h3 class="sr-only">${t('train.attachments')}</h3>
      <ul>
        ${s.attachments.map((a, i) => {
          const ind = a.indicator && s.indicators.find((x) => x.id === a.indicator);
          const tone = ind ? (ind.type === 'legit' ? 'safe' : 'threat') : '';
          return html`<li>
            <button type="button" class="attachment ${ctx.revealed && ind ? `is-marked is-marked--${tone}` : ''}" data-attachment="${i}">
              <span class="attachment__icon" aria-hidden="true">${fileIcon(a.name)}</span>
              <span class="attachment__name">${a.name}</span>
              <span class="attachment__size">${a.size}</span>
            </button>${marker(s, a.indicator, ctx)}
          </li>`;
        })}
      </ul>
    </div>`;
}

function renderSms(s, ctx) {
  const senderInd = s.indicators.find((i) => i.target === 'sender');
  return html`
    <article class="phone" aria-label="${t('train.smsFrom')} ${s.sender.name}">
      <header class="phone__head">
        <span class="phone__avatar" aria-hidden="true">${/^\+/.test(s.sender.name) ? '#' : initials(s.sender.name)}</span>
        <div>
          <span class="phone__label">${t('train.smsFrom')}</span>
          <strong class="phone__sender ${ctx.revealed && senderInd ? `is-marked is-marked--${senderInd.type === 'legit' ? 'safe' : 'threat'}` : ''}" id="mail-subject" tabindex="-1">${s.sender.name}${marker(s, senderInd?.id, ctx)}</strong>
        </div>
      </header>
      <div class="phone__thread">
        <p class="bubble">${renderSegments(s, s.body, ctx)}</p>
        <span class="bubble__time">${s.received ?? ''}</span>
      </div>
      <div class="mail__status phone__status" id="link-status" aria-live="polite"></div>
    </article>`;
}

function renderVoice(s, ctx) {
  const senderInd = s.indicators.find((i) => i.target === 'sender');
  const lines = s.body.split('\n').filter(Boolean).map((line) => {
    const m = line.match(/^(Anrufer|Du):\s*(.*)$/);
    const who = m ? (m[1] === 'Du' ? 'you' : 'caller') : 'caller';
    return { who, text: m ? m[2] : line };
  });
  return html`
    <article class="call" aria-labelledby="mail-subject">
      <header class="call__head">
        <span class="call__icon" aria-hidden="true">☎</span>
        <div>
          <span class="call__label">${t('train.callFrom')}</span>
          <strong id="mail-subject" tabindex="-1" class="${ctx.revealed && senderInd ? `is-marked is-marked--${senderInd.type === 'legit' ? 'safe' : 'threat'}` : ''}">${s.sender.name} <span class="call__number">${s.sender.address}</span>${marker(s, senderInd?.id, ctx)}</strong>
        </div>
        <span class="call__time">${s.received ?? ''}</span>
      </header>
      <h3 class="call__title">${t('train.callTranscript')}</h3>
      <ol class="call__transcript">
        ${lines.map((l) => html`<li class="line line--${l.who}"><span class="line__who">${t(`train.${l.who}`)}</span><p>${renderSegments(s, l.text, ctx)}</p></li>`)}
      </ol>
    </article>`;
}

export function renderMessage(scenario, { revealed = false } = {}) {
  const ctx = { revealed, numbers: indicatorNumbers(scenario) };
  const s = { links: [], attachments: [], ...scenario };
  if (s.channel === 'sms') return renderSms(s, ctx);
  if (s.channel === 'voice') return renderVoice(s, ctx);
  return renderEmail(s, ctx);
}

/** Vorschauzeile für den Posteingang. */
export function previewLine(s) {
  if (s.channel === 'email') return s.subject;
  return parseBody(s.body.split('\n')[0]).map((x) => x.text).join('').replace(/^(Anrufer|Du):\s*/, '').slice(0, 80);
}
