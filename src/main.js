/**
 * Einstiegspunkt: lädt Daten, rendert die Shell, startet Router und Service Worker.
 */
import { createApp } from './app.js';
import { createRouter } from './ui/router.js';
import { html, mount, $, $$, toast } from './ui/dom.js';
import { t, setLocale, formatNumber } from './i18n/i18n.js';
import { levelFromXp } from './core/scoring.js';
import { renderDashboard } from './ui/views/dashboard.js';
import { renderTrain } from './ui/views/train.js';
import { renderLexicon } from './ui/views/lexicon.js';
import { renderStats } from './ui/views/stats.js';
import { renderAdmin } from './ui/views/admin.js';

const NAV = [
  { path: '/', key: 'dashboard', icon: '◎' },
  { path: '/train', key: 'train', icon: '✉' },
  { path: '/lexicon', key: 'lexicon', icon: '☰' },
  { path: '/stats', key: 'stats', icon: '▲' },
  { path: '/admin', key: 'admin', icon: '⚙' }
];

function renderShell() {
  mount(document.getElementById('app'), html`
    <a class="skip-link" href="#main">${t('app.skipToContent')}</a>
    <header class="topbar">
      <a class="brand" href="#/" aria-label="${t('app.name')}, ${t('nav.dashboard')}">
        <svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 4 7v8c0 7.4 5.1 13.4 12 15 6.9-1.6 12-7.6 12-15V7L16 2Z" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 14h14M11 18l5 4 5-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        <span>${t('app.name')}</span>
      </a>
      <span class="sim-pill" title="${t('app.simulationNotice')}">${t('app.simulationShort')}</span>
      <div class="topbar__profile" aria-live="polite"></div>
    </header>
    <nav class="rail" aria-label="${t('nav.label')}">
      <ul>${NAV.map((n) => html`<li><a href="#${n.path}" data-path="${n.path}"><span class="rail__icon" aria-hidden="true">${n.icon}</span><span>${t(`nav.${n.key}`)}</span></a></li>`)}</ul>
    </nav>
    <main id="main" class="main" tabindex="-1"></main>
    <footer class="footer">
      <p>${t('app.simulationNotice')}</p>
      <p><a class="link" href="#/lexicon?e=meldestellen">Phishing in der Schweiz melden</a></p>
    </footer>
    <div id="toasts" class="toasts" role="status" aria-live="polite"></div>`);
}

function renderProfile(app) {
  const el = $('.topbar__profile');
  if (!el) return;
  if (!app.progress) { el.textContent = ''; return; }
  const level = levelFromXp(app.progress.xp);
  mount(el, html`<a href="#/stats" class="profile-chip"><span class="profile-chip__level">Lv ${level}</span><span>${app.progress.name}</span><span class="muted">${formatNumber(app.progress.score)}</span></a>`);
}

function markNav(path) {
  for (const a of $$('.rail a')) {
    if (a.dataset.path === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

async function boot() {
  setLocale('de');
  renderShell();
  const main = $('#main');
  mount(main, html`<p class="loading">${t('app.loading')}</p>`);

  let app;
  try {
    app = await createApp();
  } catch (err) {
    console.error(err);
    mount(main, html`<p class="banner banner--threat" role="alert">${t('app.loadError')}</p>`);
    return;
  }

  app.onChange(renderProfile);
  renderProfile(app);

  const routes = {
    '/': renderDashboard,
    '/train': renderTrain,
    '/lexicon': renderLexicon,
    '/stats': renderStats,
    '/admin': renderAdmin
  };
  let first = true;
  const router = createRouter(routes, async (view, { path, params }) => {
    markNav(routes[path] ? path : '/');
    const cleanup = await view(main, app, params);
    document.title = `${t(`nav.${NAV.find((n) => n.path === path)?.key ?? 'dashboard'}`)} – ${t('app.name')}`;
    if (!first && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
    first = false;
    window.scrollTo(0, 0);
    return cleanup;
  });
  await router.start();
  registerServiceWorker();
}

// Nur neu laden, wenn der Nutzer ein Update bestätigt hat. Beim allerersten
// Besuch übernimmt der Service Worker per clients.claim() die Seite – das darf
// keine laufende Trainingsrunde durch einen Reload zerstören.
let reloadRequested = false;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (location.protocol !== 'https:' && !local) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state !== 'installed') return;
        if (navigator.serviceWorker.controller) {
          toast(t('app.updateReady'), {
            timeout: 0,
            action: { label: t('app.reload'), onClick: () => { reloadRequested = true; sw.postMessage('skipWaiting'); } }
          });
        } else {
          toast(t('app.offlineReady'), { tone: 'safe' });
        }
      });
    });
  }).catch((err) => console.warn('[sw] Registrierung fehlgeschlagen', err));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadRequested) return;
    reloadRequested = false;
    location.reload();
  });
}

boot();
