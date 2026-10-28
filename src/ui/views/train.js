/**
 * Trainingsrunde: Posteingang links, Nachricht rechts.
 * Ablauf: Nachricht öffnen -> entscheiden -> Auswertung mit markierten Merkmalen.
 */
import { html, raw, mount, $, toast, confirmDialog, prefersReducedMotion } from '../dom.js';
import { t, formatNumber } from '../../i18n/i18n.js';
import { renderMessage, previewLine, indicatorNumbers } from '../message.js';
import { navigate } from '../router.js';
import { BADGES } from '../../core/badges.js';

const now = () => performance.now();

export function renderTrain(root, app, params) {
  if (!app.progress) { navigate('/'); return; }

  if (params.new === '1' || !app.session) {
    app.startSession({ difficulty: params.d ?? 'all', onlyOpen: params.open === '1' });
    history.replaceState(null, '', '#/train');
  }
  const session = app.session;
  if (!session.ids.length) {
    mount(root, html`<p class="panel">${t('train.selectMessage')}</p>`);
    return;
  }

  // --- Timer pro Nachricht ---------------------------------------------------
  const timerOf = (id) => (session.timers[id] ??= { acc: 0, since: null });
  const pause = (id) => {
    const tm = id && session.timers[id];
    if (tm && tm.since != null) { tm.acc += now() - tm.since; tm.since = null; }
  };
  const resume = (id) => {
    if (!id || session.results[id]) return;
    const tm = timerOf(id);
    if (tm.since == null) tm.since = now();
  };
  const elapsed = (id) => {
    const tm = timerOf(id);
    return (tm.acc + (tm.since != null ? now() - tm.since : 0)) / 1000;
  };

  mount(root, html`
    <section class="train" data-mode="inbox" aria-labelledby="train-title">
      <h1 id="train-title" class="sr-only">${t('nav.train')}</h1>
      <div class="train__bar" role="status">
        <span class="train__count"></span>
        <span class="train__timer" aria-label="${t('train.timer')}"></span>
        <span class="train__streak"></span>
        <span class="train__score"></span>
      </div>
      <div class="train__layout">
        <nav class="inbox" aria-labelledby="inbox-title">
          <h2 id="inbox-title" class="inbox__title">${t('train.inbox')}</h2>
          <ul class="inbox__list"></ul>
        </nav>
        <div class="reader" id="reader" tabindex="-1"></div>
      </div>
    </section>`);

  const section = $('.train', root);
  const list = $('.inbox__list', root);
  const reader = $('#reader', root);

  function renderBar() {
    const done = Object.keys(session.results).length;
    const current = session.currentId ? session.ids.indexOf(session.currentId) + 1 : Math.min(done + 1, session.ids.length);
    $('.train__count', root).textContent = t('train.progress', { n: current, total: session.ids.length });
    $('.train__streak', root).textContent = `${t('dashboard.streak')} ${app.progress.streak}`;
    $('.train__score', root).textContent = `${formatNumber(app.progress.score)} ${t('dashboard.score')}`;
  }

  function renderInbox() {
    mount(list, html`${session.ids.map((id) => {
      const s = app.byId.get(id);
      const r = session.results[id];
      const state = r ? (r.correct ? 'ok' : 'fail') : 'open';
      return html`
        <li>
          <button type="button" class="inbox__item inbox__item--${state} ${r ? '' : 'is-unread'}" data-id="${id}" ${id === session.currentId ? raw('aria-current="true"') : ''}>
            <span class="inbox__channel" aria-hidden="true">${s.channel === 'email' ? '✉' : s.channel === 'sms' ? '💬' : '☎'}</span>
            <span class="inbox__sender">${s.sender.name}</span>
            <span class="inbox__time">${s.received ?? ''}</span>
            <span class="inbox__preview">${previewLine(s)}</span>
            <span class="inbox__meta">
              <span class="tag tag--${s.difficulty}">${t(`difficulty.${s.difficulty}`)}</span>
              <span class="sr-only">${t(`channel.${s.channel}`)},</span>
              <span class="inbox__state">${r ? (r.correct ? '✓' : '✗') : ''}<span class="sr-only">${r ? t('train.readStatus.done') : t('train.readStatus.unread')}</span></span>
            </span>
          </button>
        </li>`;
    })}`);
  }

  /** Die dritte Aktion heisst so, wie sie im Szenario konkret aussehen würde. */
  function actionLabel(s, action) {
    if (action !== 'open') return t(`train.actions.${action}`);
    if (s.links?.length || s.attachments?.length) return t(`train.actions.open.${s.channel === 'sms' ? 'sms' : 'email'}`);
    if (s.qr) return t('train.actions.open.qr');
    return t('train.actions.open.comply');
  }

  function renderReader({ focus = false, scan = false } = {}) {
    const id = session.currentId;
    if (!id) {
      mount(reader, html`<p class="reader__empty">${t('train.selectMessage')}</p>`);
      return;
    }
    const s = app.byId.get(id);
    const r = session.results[id];
    const allDone = session.ids.every((x) => session.results[x]);
    const nextId = session.ids.find((x) => !session.results[x]);

    mount(reader, html`
      <button type="button" class="btn btn--ghost reader__back" data-action="back">← ${t('train.inbox')}</button>
      ${s.situation ? html`<aside class="situation"><strong>${t('train.situation')}:</strong> ${s.situation}</aside>` : ''}
      <div class="specimen ${r ? 'is-revealed' : ''}">${renderMessage(s, { revealed: Boolean(r) })}</div>
      ${r ? renderFeedback(s, r, { allDone, nextId }) : html`
        ${s.links?.length ? html`<p class="hint">${t('train.hoverHint')}</p>` : ''}
        <div class="decide" role="group" aria-label="${t('train.decisionLabel')}">
          <button type="button" class="btn btn--decide btn--safe" data-decide="safe">${actionLabel(s, 'safe')}</button>
          <button type="button" class="btn btn--decide btn--report" data-decide="report">${actionLabel(s, 'report')}</button>
          <button type="button" class="btn btn--decide btn--open" data-decide="open">${actionLabel(s, 'open')}</button>
        </div>`}
    `);

    if (scan && !prefersReducedMotion()) {
      const spec = $('.specimen', reader);
      spec.classList.add('is-scanning');
      setTimeout(() => spec.classList.remove('is-scanning'), 1100);
    }
    if (focus) (r ? $('#fb-title', reader) : $('#mail-subject', reader))?.focus({ preventScroll: false });
  }

  function renderFeedback(s, r, { allDone, nextId }) {
    const good = r.correct;
    const numbers = indicatorNumbers(s);
    const detail = t(`train.outcomeDetail.${r.outcome}`);
    return html`
      <section class="feedback feedback--${good ? 'good' : 'bad'}" aria-labelledby="fb-title">
        <p class="feedback__choice">${t('train.decisionLabel')}: ${actionLabel(s, r.action)}</p>
        <h2 id="fb-title" tabindex="-1">${t(`train.outcome.${r.outcome}`)}</h2>
        ${detail ? html`<p>${detail}</p>` : ''}
        ${r.firstAttempt
          ? html`<p class="feedback__points"><strong>${r.points > 0 ? '+' : ''}${formatNumber(r.points)}</strong> ${t('dashboard.score')}
              ${good ? html`<small>${t('train.pointsBreakdown', { base: r.base, bonus: r.timeBonus, multiplier: r.multiplier.toFixed(1) })}</small>` : ''}</p>`
          : html`<p class="muted">${t('train.replayNote')}</p>`}
        <h3>${s.isPhishing ? t('train.evidence') : t('train.evidenceLegit')}</h3>
        <ol class="evidence">
          ${s.indicators.map((ind) => html`
            <li class="evidence__item evidence__item--${ind.type === 'legit' ? 'safe' : ind.type === 'context' && !s.isPhishing ? 'neutral' : 'threat'}">
              <span class="marker marker--${ind.type === 'legit' ? 'safe' : 'threat'}" aria-hidden="true">${numbers.get(ind.id)}</span>
              <div>
                <p class="evidence__title"><span class="sr-only">Hinweis ${numbers.get(ind.id)}: </span>${ind.title} <span class="tag">${t(`indicatorType.${ind.type}`)}</span></p>
                <p>${ind.explanation}</p>
              </div>
            </li>`)}
        </ol>
        <h3>${t('train.takeaway')}</h3>
        <p>${s.explanation}</p>
        <div class="feedback__actions">
          ${allDone
            ? html`<button type="button" class="btn btn--signal" data-action="finish">${t('train.finish')}</button>`
            : html`<button type="button" class="btn btn--signal" data-action="next" data-next="${nextId}">${t('train.next')}</button>`}
        </div>
      </section>`;
  }

  function renderSummary() {
    pause(session.currentId);
    session.currentId = null;
    section.dataset.mode = 'reader';
    const results = session.ids.map((id) => ({ s: app.byId.get(id), r: session.results[id] }));
    const correct = results.filter((x) => x.r?.correct).length;
    const points = results.reduce((sum, x) => sum + (x.r?.points ?? 0), 0);
    const newBadges = results.flatMap((x) => x.r?.newBadges ?? []);
    mount(reader, html`
      <section class="summary" aria-labelledby="sum-title">
        <h2 id="sum-title" class="display" tabindex="-1">${t('summary.title')}</h2>
        <dl class="readouts readouts--compact">
          <div class="readout"><dt>${t('dashboard.accuracy')}</dt><dd>${t('summary.correct', { correct, total: results.length })}</dd></div>
          <div class="readout"><dt>${t('dashboard.score')}</dt><dd>${formatNumber(points)}</dd></div>
        </dl>
        ${newBadges.length ? html`<ul class="badge-strip">${newBadges.map((id) => {
          const b = BADGES.find((x) => x.id === id);
          return html`<li class="badge"><span aria-hidden="true">${b.icon}</span>${t(`badges.${id}.title`)}</li>`;
        })}</ul>` : ''}
        <h3>${t('summary.review')}</h3>
        <ul class="review">
          ${results.map(({ s, r }) => html`<li class="review__item review__item--${r?.correct ? 'ok' : 'fail'}">
            <span aria-hidden="true">${r?.correct ? '✓' : '✗'}</span>
            <span>${s.title}</span>
            <span class="muted">${t(`train.actionsShort.${r.action}`)}</span>
          </li>`)}
        </ul>
        <div class="feedback__actions">
          <button type="button" class="btn btn--signal" data-action="again">${t('summary.again')}</button>
          <a class="btn btn--ghost" href="#/">${t('summary.toDashboard')}</a>
        </div>
      </section>`);
    $('#sum-title', reader).focus();
    renderInbox();
  }

  function select(id, { focus = true } = {}) {
    pause(session.currentId);
    session.currentId = id;
    resume(id);
    section.dataset.mode = 'reader';
    renderInbox();
    renderBar();
    renderReader({ focus });
  }

  async function decide(action) {
    const id = session.currentId;
    if (!id || session.results[id]) return;
    pause(id);
    const seconds = elapsed(id);
    const result = await app.decide(id, action, seconds);
    renderInbox();
    renderBar();
    renderReader({ focus: true, scan: true });
    if (result.levelUp) toast(t('train.levelUp', { level: result.levelUp }), { tone: 'signal' });
    for (const b of result.newBadges) toast(t('train.newBadge', { title: t(`badges.${b}.title`) }), { tone: 'signal' });
  }

  async function confirmOpen() {
    const ok = await confirmDialog({
      title: t('train.confirmOpen.title'),
      text: t('train.confirmOpen.text'),
      confirm: t('train.confirmOpen.confirm'),
      cancel: t('train.confirmOpen.cancel')
    });
    if (ok) decide('open');
  }

  // --- Events (Delegation) ---------------------------------------------------
  root.addEventListener('click', onClick);
  function onClick(e) {
    const item = e.target.closest('.inbox__item');
    if (item) return select(item.dataset.id);
    const dec = e.target.closest('[data-decide]');
    if (dec) return dec.dataset.decide === 'open' ? confirmOpen() : decide(dec.dataset.decide);
    const simTarget = e.target.closest('.sim-link, .attachment');
    if (simTarget) {
      e.preventDefault();
      if (!session.results[session.currentId]) confirmOpen();
      return;
    }
    const act = e.target.closest('[data-action]');
    if (!act) return;
    if (act.dataset.action === 'next') select(act.dataset.next);
    if (act.dataset.action === 'finish') renderSummary();
    if (act.dataset.action === 'again') navigate('/train', { d: session.difficulty, open: '1', new: '1' });
    if (act.dataset.action === 'back') {
      pause(session.currentId);
      section.dataset.mode = 'inbox';
      $(`.inbox__item[data-id="${session.currentId}"]`, root)?.focus();
    }
  }

  // Hover-/Fokus-Vorschau der Ziel-URL – wie die Statusleiste eines Browsers
  const showUrl = (e) => {
    const link = e.target.closest?.('.sim-link');
    const status = $('#link-status', reader);
    if (link && status) status.textContent = t('train.linkStatus', { url: link.dataset.url });
  };
  const hideUrl = (e) => {
    const link = e.target.closest?.('.sim-link');
    const status = $('#link-status', reader);
    if (link && status) status.textContent = '';
  };
  reader.addEventListener('mouseover', showUrl);
  reader.addEventListener('focusin', showUrl);
  reader.addEventListener('mouseout', hideUrl);
  reader.addEventListener('focusout', hideUrl);

  // Timer anhalten, wenn der Tab im Hintergrund ist
  const onVisibility = () => (document.hidden ? pause(session.currentId) : resume(session.currentId));
  document.addEventListener('visibilitychange', onVisibility);

  const tick = setInterval(() => {
    const el = $('.train__timer', root);
    if (!el) return;
    const id = session.currentId;
    const sec = id ? Math.floor(session.results[id] ? (session.results[id].seconds ?? elapsed(id)) : elapsed(id)) : 0;
    el.textContent = `⏱ ${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }, 250);

  // Start: erste offene Nachricht wählen (auf Mobile bleibt der Posteingang sichtbar)
  renderInbox();
  renderBar();
  const first = session.currentId && !session.results[session.currentId]
    ? session.currentId
    : session.ids.find((x) => !session.results[x]);
  if (first) {
    session.currentId = first;
    resume(first);
    renderInbox();
    renderReader();
    if (window.matchMedia('(min-width: 900px)').matches) section.dataset.mode = 'reader';
  } else {
    renderSummary();
  }

  return () => {
    pause(session.currentId);
    clearInterval(tick);
    root.removeEventListener('click', onClick);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
