import { html, mount, $ } from '../dom.js';
import { t, formatNumber, formatPercent } from '../../i18n/i18n.js';
import { levelProgress } from '../../core/scoring.js';
import { computeStats } from '../../core/progress.js';
import { BADGES } from '../../core/badges.js';
import { progressRing } from '../charts.js';
import { navigate } from '../router.js';

export function levelTitle(level) {
  const titles = t('dashboard.levelTitle');
  return titles[Math.min(level, titles.length) - 1];
}

export function renderOnboarding(root, app) {
  mount(root, html`
    <section class="onboarding" aria-labelledby="ob-title">
      <h1 id="ob-title" class="display">${t('onboarding.title')}</h1>
      <p class="lead">${t('onboarding.lead')}</p>
      <form class="onboarding__form" novalidate>
        <label for="ob-name">${t('onboarding.nameLabel')}</label>
        <div class="field-row">
          <input id="ob-name" name="name" autocomplete="nickname" maxlength="40" placeholder="${t('onboarding.namePlaceholder')}" required>
          <button class="btn btn--signal" type="submit">${t('onboarding.start')}</button>
        </div>
      </form>
      <p class="muted">${t('onboarding.persona')}</p>
      <p class="muted">${t('onboarding.privacy')}</p>
    </section>`);
  const form = $('form', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    if (!name) { form.name.focus(); return; }
    await app.createProfile(name);
    navigate('/');
  });
  $('#ob-name', root).focus();
}

export function renderDashboard(root, app) {
  if (!app.progress) return renderOnboarding(root, app);
  const p = app.progress;
  const lp = levelProgress(p.xp);
  const stats = computeStats(p, app.scenarios);
  const earned = BADGES.filter((b) => p.badges[b.id]);
  const tips = app.lexicon.tips;
  const tip = tips[new Date().getDate() % tips.length];

  mount(root, html`
    <section class="cockpit" aria-labelledby="cp-title">
      <header class="cockpit__head">
        <div class="cockpit__rank">
          ${progressRing(lp.ratio, t('dashboard.xpToNext', { current: lp.current, needed: lp.needed, next: lp.level + 1 }))}
          <span class="cockpit__level">${lp.level}</span>
        </div>
        <div>
          <h1 id="cp-title" class="display">${t('dashboard.greeting', { name: p.name })}</h1>
          <p class="cockpit__title">${t('dashboard.level', { level: lp.level })}: ${levelTitle(lp.level)}</p>
          <p class="muted">${lp.needed ? t('dashboard.xpToNext', { current: formatNumber(lp.current), needed: formatNumber(lp.needed), next: lp.level + 1 }) : t('dashboard.maxLevel')}</p>
        </div>
      </header>

      <dl class="readouts">
        <div class="readout"><dt>${t('dashboard.score')}</dt><dd>${formatNumber(p.score)}</dd></div>
        <div class="readout"><dt>${t('dashboard.streak')}</dt><dd>${p.streak}<small>${t('dashboard.bestStreak', { n: p.bestStreak })}</small></dd></div>
        <div class="readout"><dt>${t('dashboard.accuracy')}</dt><dd>${stats.answered ? formatPercent(stats.accuracy) : '–'}</dd></div>
        <div class="readout"><dt>${t('dashboard.solved')}</dt><dd>${t('dashboard.solvedOf', { n: stats.answered, total: stats.total })}</dd></div>
      </dl>

      <section class="panel launch" aria-labelledby="launch-title">
        <h2 id="launch-title">${t('dashboard.startTitle')}</h2>
        <p class="muted">${t('dashboard.startLead')}</p>
        <form class="launch__form">
          <fieldset class="segmented">
            <legend class="sr-only">Schwierigkeit</legend>
            ${['all', 'easy', 'medium', 'hard'].map((d, i) => html`
              <label class="segmented__opt">
                <input type="radio" name="d" value="${d}" ${i === 0 ? 'checked' : ''}>
                <span>${t(`difficulty.${d}`)}</span>
              </label>`)}
          </fieldset>
          <label class="check"><input type="checkbox" name="open" ${stats.answered > 0 && stats.answered < stats.total ? 'checked' : ''}> ${t('dashboard.onlyOpen')}</label>
          <button class="btn btn--signal btn--large" type="submit">${t('dashboard.start')}</button>
        </form>
      </section>

      <div class="cockpit__grid">
        <section class="panel" aria-labelledby="badges-title">
          <h2 id="badges-title">${t('dashboard.badgesTitle')}</h2>
          ${earned.length
            ? html`<ul class="badge-strip">${earned.slice(-6).map((b) => html`<li class="badge" title="${t(`badges.${b.id}.desc`)}"><span aria-hidden="true">${b.icon}</span>${t(`badges.${b.id}.title`)}</li>`)}</ul>`
            : html`<p class="muted">${t('dashboard.badgesEmpty')}</p>`}
          <a class="link" href="#/stats">${t('dashboard.allBadges')}</a>
        </section>
        <section class="panel panel--tip" aria-labelledby="tip-title">
          <h2 id="tip-title">${t('dashboard.tipTitle')}</h2>
          <p class="tip">${tip}</p>
          <p class="muted small">${t('dashboard.reportHint')}</p>
        </section>
      </div>
    </section>`);

  $('.launch__form', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    navigate('/train', { d: f.d.value, open: f.open.checked ? '1' : '0', new: '1' });
  });
}
