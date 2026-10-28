import { html, mount, $, toast, confirmDialog, downloadText } from '../dom.js';
import { t, formatNumber, formatPercent } from '../../i18n/i18n.js';
import { computeStats, exportProgress, importProgress } from '../../core/progress.js';
import { BADGES } from '../../core/badges.js';
import { barChart } from '../charts.js';
import { navigate } from '../router.js';
import { DIFFICULTIES, CHANNELS } from '../../core/validator.js';

function groupRows(group, keys, labelPrefix) {
  return keys.filter((k) => group[k]).map((k) => {
    const g = group[k];
    return {
      label: t(`${labelPrefix}.${k}`),
      value: g.correct,
      max: g.answered,
      display: `${g.correct}/${g.answered}`,
      tone: g.correct / g.answered >= 0.8 ? 'safe' : g.correct / g.answered >= 0.5 ? 'signal' : 'threat'
    };
  });
}

export function renderStats(root, app) {
  if (!app.progress) { navigate('/'); return; }
  const p = app.progress;
  const st = computeStats(p, app.scenarios);
  const categories = Object.keys(st.groups.category).sort();
  const history = [...p.history].reverse().slice(0, 15);

  mount(root, html`
    <section class="stats" aria-labelledby="st-title">
      <h1 id="st-title" class="display">${t('stats.title')}</h1>

      <dl class="readouts">
        <div class="readout"><dt>${t('dashboard.accuracy')}</dt><dd>${st.answered ? formatPercent(st.accuracy) : '–'}</dd></div>
        <div class="readout"><dt>${t('stats.falsePositives')}</dt><dd>${st.falsePositives}</dd></div>
        <div class="readout"><dt>${t('stats.missed')}</dt><dd>${st.missed}</dd></div>
        <div class="readout"><dt>${t('stats.compromised')}</dt><dd>${st.compromised}</dd></div>
        <div class="readout"><dt>${t('stats.avgTime')}</dt><dd>${st.answered ? t('stats.seconds', { n: formatNumber(st.avgSeconds, 1) }) : '–'}</dd></div>
      </dl>

      ${st.answered ? html`
        <div class="stats__charts">
          <section class="panel">${barChart(groupRows(st.groups.difficulty, DIFFICULTIES, 'difficulty'), { caption: t('stats.byDifficulty'), valueHeader: t('stats.rate') })}</section>
          <section class="panel">${barChart(groupRows(st.groups.channel, CHANNELS, 'channel'), { caption: t('stats.byChannel'), valueHeader: t('stats.rate') })}</section>
          <section class="panel panel--wide">${barChart(groupRows(st.groups.category, categories, 'category'), { caption: t('stats.byCategory'), valueHeader: t('stats.rate') })}</section>
        </div>` : ''}

      <section class="panel" aria-labelledby="hist-title">
        <h2 id="hist-title">${t('stats.history')}</h2>
        ${history.length ? html`
          <div class="table-wrap"><table class="table">
            <thead><tr><th scope="col">Szenario</th><th scope="col">${t('train.decisionLabel')}</th><th scope="col">${t('dashboard.score')}</th><th scope="col">Zeit</th></tr></thead>
            <tbody>${history.map((h) => html`<tr class="${h.correct ? 'is-ok' : 'is-fail'}">
              <td>${app.byId.get(h.scenarioId)?.title ?? h.scenarioId}${h.replay ? html` <span class="tag">${t('stats.replay')}</span>` : ''}</td>
              <td>${h.correct ? '✓' : '✗'} ${t(`train.actionsShort.${h.action}`)}</td>
              <td>${h.points}</td>
              <td>${t('stats.seconds', { n: formatNumber(h.seconds, 0) })}</td>
            </tr>`)}</tbody>
          </table></div>` : html`<p class="muted">${t('stats.historyEmpty')}</p>`}
      </section>

      <section class="panel" aria-labelledby="bdg-title">
        <h2 id="bdg-title">${t('stats.badges')}</h2>
        <ul class="badge-grid">
          ${BADGES.map((b) => html`<li class="badge-card ${p.badges[b.id] ? 'is-earned' : ''}">
            <span class="badge-card__icon" aria-hidden="true">${b.icon}</span>
            <strong>${t(`badges.${b.id}.title`)}</strong>
            <span class="small">${t(`badges.${b.id}.desc`)}</span>
            <span class="sr-only">${p.badges[b.id] ? 'erreicht' : 'noch nicht erreicht'}</span>
          </li>`)}
        </ul>
      </section>

      <section class="panel" aria-labelledby="prof-title">
        <h2 id="prof-title">${t('stats.profiles')}</h2>
        <ul class="profiles">
          ${app.profiles.map((pr) => html`<li>
            <span>${pr.name}${pr.id === p.profileId ? html` <span class="tag tag--signal">${t('stats.active')}</span>` : ''}</span>
            <span class="profiles__actions">
              ${pr.id !== p.profileId ? html`<button type="button" class="btn btn--small" data-switch="${pr.id}">${t('stats.switchTo')}</button>` : ''}
              <button type="button" class="btn btn--small btn--ghost" data-delete="${pr.id}" data-name="${pr.name}">${t('stats.deleteProfile')}</button>
            </span>
          </li>`)}
        </ul>
        <form class="field-row profiles__new">
          <label for="new-profile" class="sr-only">${t('stats.newProfile')}</label>
          <input id="new-profile" name="name" maxlength="40" placeholder="${t('onboarding.namePlaceholder')}" required>
          <button type="submit" class="btn">${t('stats.newProfile')}</button>
        </form>
        <div class="io">
          <button type="button" class="btn" data-action="export">${t('stats.export')}</button>
          <label class="btn btn--ghost io__import">${t('stats.import')}<input type="file" accept="application/json,.json" class="sr-only" data-action="import"></label>
          <p class="muted small">${t('stats.exportHint')}</p>
        </div>
      </section>
    </section>`);

  // Bei erneutem Rendern (Profilwechsel) alten Listener entfernen
  if (root._statsClick) root.removeEventListener('click', root._statsClick);
  root._statsClick = onClick;
  root.addEventListener('click', onClick);
  async function onClick(e) {
    const sw = e.target.closest('[data-switch]');
    if (sw) { await app.switchProfile(sw.dataset.switch); renderStats(root, app); return; }
    const del = e.target.closest('[data-delete]');
    if (del) {
      const ok = await confirmDialog({
        title: t('stats.deleteProfile'),
        text: t('stats.confirmDelete', { name: del.dataset.name }),
        confirm: t('stats.deleteProfile'),
        cancel: t('common.cancel')
      });
      if (!ok) return;
      await app.deleteProfile(del.dataset.delete);
      if (!app.progress) navigate('/'); else renderStats(root, app);
      return;
    }
    if (e.target.closest('[data-action="export"]')) {
      const date = new Date().toISOString().slice(0, 10);
      downloadText(`phishguard-${p.name.replace(/\W+/g, '_')}-${date}.json`, exportProgress(app.progress));
    }
  }

  $('[data-action="import"]', root).addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const progress = importProgress(await file.text());
      await app.repo.importAsProfile(progress);
      await app.loadActiveProfile();
      toast(t('stats.importOk', { name: progress.name }), { tone: 'safe' });
      renderStats(root, app);
    } catch (err) {
      toast(t(err.message), { tone: 'threat' });
    }
  });

  $('.profiles__new', root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.currentTarget.name.value.trim();
    if (!name) return;
    await app.createProfile(name);
    renderStats(root, app);
  });

  return () => {
    if (root._statsClick) root.removeEventListener('click', root._statsClick);
    root._statsClick = null;
  };
}
