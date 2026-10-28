/**
 * Trainer-Ansicht: Kampagnen planen und einen simulierten Bericht ansehen.
 * Alles läuft über CampaignService -> MailTransport (hier: MockTransport).
 */
import { html, mount, $, toast, confirmDialog } from '../dom.js';
import { t, formatNumber, formatPercent } from '../../i18n/i18n.js';
import { generateRecipients, parseRecipientList, DEPARTMENTS } from '../../admin/recipients.js';
import { barChart, lineChart } from '../charts.js';
import { navigate } from '../router.js';
import { DIFFICULTIES } from '../../core/validator.js';

let draftRecipients = generateRecipients(25);

const fmtMinutes = (m) => (m < 60 ? t('common.minutes', { n: Math.round(m) }) : t('common.hoursMinutes', { h: Math.floor(m / 60), m: Math.round(m % 60) }));

export async function renderAdmin(root, app, params) {
  const campaigns = await app.campaigns.list();
  const selected = campaigns.find((c) => c.id === params.c) ?? campaigns[0] ?? null;
  const phishing = app.scenarios.filter((s) => s.isPhishing && s.channel === 'email');

  mount(root, html`
    <section class="admin" aria-labelledby="ad-title">
      <h1 id="ad-title" class="display">${t('admin.title')}</h1>
      <p class="lead">${t('admin.lead')}</p>
      <p class="banner banner--mock" role="note"><strong>${t('app.simulationShort')}.</strong> ${t('admin.mockBanner')}</p>
      <p class="muted small">${t('admin.transport', { label: app.transport.label })}</p>

      <div class="admin__grid">
        <section class="panel" aria-labelledby="new-title">
          <h2 id="new-title">${t('admin.newCampaign')}</h2>
          <form class="form" id="campaign-form" novalidate>
            <label for="c-name">${t('admin.name')}</label>
            <input id="c-name" name="name" maxlength="80" placeholder="${t('admin.namePlaceholder')}" required>

            <label for="c-scenario">${t('admin.scenario')}</label>
            <select id="c-scenario" name="scenario" required>
              ${DIFFICULTIES.map((d) => html`<optgroup label="${t(`difficulty.${d}`)}">
                ${phishing.filter((s) => s.difficulty === d).map((s) => html`<option value="${s.id}">${s.title} (${t(`channel.${s.channel}`)})</option>`)}
              </optgroup>`)}
            </select>

            <fieldset class="form__group">
              <legend>${t('admin.recipients')}</legend>
              <div class="field-row">
                <label for="c-count" class="sr-only">${t('admin.count')}</label>
                <input id="c-count" type="number" min="5" max="200" value="${draftRecipients.length}" inputmode="numeric">
                <button type="button" class="btn" data-action="generate">${t('admin.generate')}</button>
              </div>
              <details class="paste">
                <summary>${t('admin.paste')}</summary>
                <p class="muted small" id="paste-hint">${t('admin.pasteHint')}</p>
                <textarea id="c-paste" rows="4" aria-describedby="paste-hint" placeholder="Muster Max; max.muster@firma.example; Verkauf"></textarea>
                <button type="button" class="btn btn--small" data-action="paste">${t('admin.pasteApply')}</button>
              </details>
              <p class="recipients__count" aria-live="polite"></p>
              <div class="table-wrap recipients__preview"></div>
            </fieldset>

            <label class="check"><input type="checkbox" name="trained"> ${t('admin.trained')}</label>
            <p class="muted small">${t('admin.trainedHint')}</p>

            <button type="submit" class="btn btn--signal">${t('admin.create')}</button>
          </form>
        </section>

        <section class="panel" aria-labelledby="list-title">
          <h2 id="list-title">${t('admin.campaigns')}</h2>
          ${campaigns.length ? html`<ul class="campaigns">
            ${campaigns.map((c) => html`<li class="${selected && c.id === selected.id ? 'is-selected' : ''}">
              <a href="#/admin?c=${c.id}" class="campaigns__link">
                <strong>${c.name}</strong>
                <span class="muted small">${app.byId.get(c.scenarioId)?.title ?? c.scenarioId}, ${t('admin.recipientsCount', { n: c.recipients.length })}</span>
              </a>
              <span class="tag ${c.status === 'done' ? 'tag--safe' : ''}">${t(`admin.status.${c.status}`)}</span>
            </li>`)}
          </ul>` : html`<p class="muted">${t('admin.noCampaigns')}</p>`}
        </section>
      </div>

      <div id="report"></div>
    </section>`);

  const form = $('#campaign-form', root);

  function renderRecipients() {
    $('.recipients__count', root).textContent = t('admin.recipientsCount', { n: draftRecipients.length });
    mount($('.recipients__preview', root), html`
      <table class="table table--compact">
        <thead><tr><th scope="col">Name</th><th scope="col">E-Mail</th><th scope="col">${t('admin.department')}</th></tr></thead>
        <tbody>${draftRecipients.slice(0, 5).map((r) => html`<tr><td>${r.name}</td><td class="mono">${r.email}</td><td>${DEPARTMENTS.find((d) => d.id === r.department)?.label}</td></tr>`)}</tbody>
      </table>
      ${draftRecipients.length > 5 ? html`<p class="muted small">… +${draftRecipients.length - 5}</p>` : ''}`);
  }
  renderRecipients();

  form.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'generate') {
      const n = Math.max(5, Math.min(200, Number($('#c-count', root).value) || 25));
      draftRecipients = generateRecipients(n, `seed-${Date.now()}`);
      renderRecipients();
    }
    if (a.dataset.action === 'paste') {
      const { recipients, errors } = parseRecipientList($('#c-paste', root).value);
      if (recipients.length) { draftRecipients = recipients; renderRecipients(); }
      if (errors.length) toast(t('admin.pasteErrors', { n: errors.length }), { tone: 'threat' });
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const c = await app.campaigns.create({
        name: form.name.value,
        scenarioId: form.scenario.value,
        recipients: draftRecipients,
        trained: form.trained.checked
      });
      navigate('/admin', { c: c.id });
    } catch (err) {
      const key = `admin.errors.${err.message.split('.').pop()}`;
      toast(t(key), { tone: 'threat' });
      if (err.message.endsWith('nameRequired')) form.name.focus();
    }
  });

  if (selected) await renderReport($('#report', root), app, selected);
}

async function renderReport(el, app, c) {
  const scenario = app.byId.get(c.scenarioId);
  if (c.status === 'draft') {
    mount(el, html`
      <section class="panel report" aria-labelledby="rep-title">
        <h2 id="rep-title">${c.name}</h2>
        <p>${scenario?.title}, ${t('admin.recipientsCount', { n: c.recipients.length })}</p>
        <div class="feedback__actions">
          <button type="button" class="btn btn--signal" data-action="start">${t('admin.start')}</button>
          <button type="button" class="btn btn--ghost" data-action="delete">${t('admin.delete')}</button>
        </div>
      </section>`);
  } else {
    const rep = await app.campaigns.report(c.id);
    const outbox = (await app.storage.get(`outbox:${c.id}`)) ?? [];
    const kpis = ['sent', 'opened', 'clicked', 'submitted', 'reported'];
    const tones = { sent: 'muted', opened: 'signal', clicked: 'threat', submitted: 'threat', reported: 'safe' };
    mount(el, html`
      <section class="panel report" aria-labelledby="rep-title">
        <div class="report__head">
          <h2 id="rep-title">${t('admin.report')}: ${c.name}</h2>
          <button type="button" class="btn btn--small btn--ghost" data-action="delete">${t('admin.delete')}</button>
        </div>
        <p class="muted">${scenario?.title}${c.trained ? `, ${t('admin.trained')}` : ''}</p>
        <dl class="readouts">
          ${kpis.map((k) => html`<div class="readout readout--${tones[k]}"><dt>${t(`admin.kpi.${k}`)}</dt>
            <dd>${rep.counts[k]}${k !== 'sent' ? html`<small>${formatPercent(rep.rates[k])}</small>` : ''}</dd></div>`)}
        </dl>
        <p>${rep.medianReportMinutes != null ? t('admin.medianReport', { time: fmtMinutes(rep.medianReportMinutes) }) : t('admin.noReports')}</p>
        <div class="stats__charts">
          <div>${barChart(kpis.map((k) => ({ label: t(`admin.kpi.${k}`), value: rep.counts[k], max: rep.counts.sent, display: formatNumber(rep.counts[k]), tone: tones[k] })), { caption: t('admin.funnel') })}</div>
          <div>${lineChart(rep.timeline.map((b) => t('admin.hours', { n: b.hour })), [
            { name: t('admin.kpi.opened'), values: rep.timeline.map((b) => b.opened), tone: 'signal' },
            { name: t('admin.kpi.clicked'), values: rep.timeline.map((b) => b.clicked), tone: 'threat' },
            { name: t('admin.kpi.reported'), values: rep.timeline.map((b) => b.reported), tone: 'safe' }
          ], { caption: t('admin.timeline'), yMax: rep.counts.sent })}</div>
        </div>
        <h3>${t('admin.departments')}</h3>
        <div class="table-wrap"><table class="table">
          <thead><tr><th scope="col">${t('admin.department')}</th><th scope="col">${t('admin.size')}</th>
            ${kpis.slice(1).map((k) => html`<th scope="col">${t(`admin.kpi.${k}`)}</th>`)}</tr></thead>
          <tbody>${rep.departments.map((d) => html`<tr><th scope="row">${d.label}</th><td>${d.size}</td>
            ${kpis.slice(1).map((k) => html`<td>${d[k]} <span class="muted small">(${formatPercent(d.size ? d[k] / d.size : 0)})</span></td>`)}</tr>`)}</tbody>
        </table></div>
        <details class="outbox">
          <summary>${t('admin.outbox')} (${outbox.length})</summary>
          <p class="muted small">${t('admin.outboxNote')}</p>
          <ul class="mono small">${outbox.slice(0, 8).map((m) => html`<li>${m.to}: «${m.subject}»</li>`)}</ul>
        </details>
      </section>`);
  }

  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.dataset.action === 'start') {
      a.disabled = true;
      a.textContent = t('admin.starting');
      await app.campaigns.start(c.id, scenario);
      navigate('/admin', { c: c.id });
    }
    if (a.dataset.action === 'delete') {
      const ok = await confirmDialog({ title: t('admin.delete'), text: c.name, confirm: t('admin.delete'), cancel: t('common.cancel') });
      if (!ok) return;
      await app.campaigns.remove(c.id);
      navigate('/admin');
    }
  });
}
