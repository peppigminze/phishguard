import { html, mount, $, $$ } from '../dom.js';
import { t } from '../../i18n/i18n.js';

export function renderLexicon(root, app, params) {
  const { sections } = app.lexicon;
  mount(root, html`
    <section class="lexicon" aria-labelledby="lex-title">
      <h1 id="lex-title" class="display">${t('lexicon.title')}</h1>
      <p class="lead">${t('lexicon.lead')}</p>
      <div class="lexicon__search">
        <label for="lex-q" class="sr-only">${t('lexicon.search')}</label>
        <input id="lex-q" type="search" placeholder="${t('lexicon.search')}" autocomplete="off">
      </div>
      <p class="lexicon__empty muted" hidden>${t('lexicon.noResults')}</p>
      ${sections.map((sec) => html`
        <section class="lexicon__section" aria-labelledby="sec-${sec.id}">
          <h2 id="sec-${sec.id}">${sec.title}</h2>
          <div class="lexicon__entries">
            ${sec.entries.map((e) => html`
              <details class="entry" id="lex-${e.id}" data-search="${[e.title, ...e.tags, ...e.body].join(' ').toLowerCase()}">
                <summary>${e.title}</summary>
                ${e.body.map((p) => html`<p>${p}</p>`)}
              </details>`)}
          </div>
        </section>`)}
    </section>`);

  const input = $('#lex-q', root);
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    for (const entry of $$('.entry', root)) {
      const hit = !q || entry.dataset.search.includes(q);
      entry.hidden = !hit;
      if (hit) visible++;
      if (q && hit) entry.open = true;
    }
    for (const sec of $$('.lexicon__section', root)) sec.hidden = !$$('.entry:not([hidden])', sec).length;
    $('.lexicon__empty', root).hidden = visible > 0;
  });

  // Direktlink auf einen Eintrag: #/lexicon?e=meldestellen
  if (params.e) {
    const target = $(`#lex-${CSS.escape(params.e)}`, root);
    if (target) { target.open = true; target.scrollIntoView(); target.querySelector('summary').focus(); }
  }
}
