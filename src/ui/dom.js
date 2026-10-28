/**
 * Kleine DOM-Helfer ohne Framework.
 * `html` ist ein Tagged Template, das alle Werte escaped – ausser sie
 * wurden explizit mit raw() markiert. So bleibt Szenario-Text (auch aus
 * Community-Beiträgen) immer reiner Text und kann kein HTML einschleusen.
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(String(s ?? ''));

function renderValue(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  if (v === false || v == null) return '';
  return escapeHtml(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += renderValue(v) + strings[i + 1]; });
  return raw(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Setzt HTML in ein Element. */
export function mount(el, content) {
  el.innerHTML = String(content);
  return el;
}

// --- Toasts (aria-live) -----------------------------------------------------

export function toast(message, { tone = 'info', action = null, timeout = 4500 } = {}) {
  const region = document.getElementById('toasts');
  if (!region) return;
  const item = document.createElement('div');
  item.className = `toast toast--${tone}`;
  item.textContent = message;
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--small';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { action.onClick(); item.remove(); });
    item.append(btn);
  }
  region.append(item);
  if (timeout) setTimeout(() => item.remove(), timeout);
}

// --- Bestätigungsdialog ------------------------------------------------------

/** Promise<boolean> – nutzt das native <dialog>-Element (Fokusfalle inklusive). */
export function confirmDialog({ title, text, confirm, cancel }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.setAttribute('aria-labelledby', 'dlg-title');
    dlg.innerHTML = String(html`
      <h2 id="dlg-title">${title}</h2>
      <p>${text}</p>
      <div class="dialog__actions">
        <button type="button" class="btn btn--ghost" value="cancel">${cancel}</button>
        <button type="button" class="btn btn--threat" value="ok">${confirm}</button>
      </div>`);
    document.body.append(dlg);
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) done(b.value === 'ok');
    });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    dlg.showModal();
    dlg.querySelector('button[value="cancel"]').focus();
  });
}

/** Datei herunterladen (lokal erzeugt, kein Netzwerk). */
export function downloadText(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const prefersReducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
