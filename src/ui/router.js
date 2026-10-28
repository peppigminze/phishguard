/**
 * Hash-Router: funktioniert auf GitHub Pages ohne Server-Rewrites.
 * Routen: #/  #/train?d=easy&open=1&new=1  #/lexicon  #/stats  #/admin
 */
export function parseHash(hash = location.hash) {
  const clean = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = clean.split('?');
  return { path: path || '/', params: Object.fromEntries(new URLSearchParams(query)) };
}

export function navigate(path, params = {}) {
  const q = new URLSearchParams(params).toString();
  const target = `#${path}${q ? `?${q}` : ''}`;
  if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = target;
}

export function createRouter(routes, onRoute) {
  let cleanup = null;
  async function handle() {
    const { path, params } = parseHash();
    const view = routes[path] ?? routes['/'];
    if (typeof cleanup === 'function') cleanup();
    cleanup = await onRoute(view, { path, params });
  }
  window.addEventListener('hashchange', handle);
  return { start: handle };
}
