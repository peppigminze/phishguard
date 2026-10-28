/**
 * Schlanke, barrierefreie SVG-Charts (keine Bibliothek, kein Netzwerk).
 * Jede Grafik hat eine Beschriftung und eine visuell versteckte Datentabelle
 * für Screenreader.
 */
import { html, raw, escapeHtml } from './dom.js';

/**
 * Horizontale Balken.
 * @param {{label:string, value:number, max:number, display:string, tone?:string}[]} rows
 */
export function barChart(rows, { caption, valueHeader = 'Wert' } = {}) {
  const rowH = 30;
  const labelW = 132;
  const width = 520;
  const barW = width - labelW - 64;
  const height = rows.length * rowH + 6;
  const bars = rows.map((r, i) => {
    const y = i * rowH + 4;
    const ratio = r.max > 0 ? Math.max(0, Math.min(1, r.value / r.max)) : 0;
    return `
      <text x="0" y="${y + 17}" class="chart__label">${escapeHtml(r.label)}</text>
      <rect x="${labelW}" y="${y + 4}" width="${barW}" height="16" rx="3" class="chart__track"/>
      <rect x="${labelW}" y="${y + 4}" width="${Math.max(ratio * barW, ratio > 0 ? 3 : 0)}" height="16" rx="3" class="chart__bar chart__bar--${r.tone ?? 'signal'}"/>
      <text x="${labelW + barW + 8}" y="${y + 17}" class="chart__value">${escapeHtml(r.display)}</text>`;
  }).join('');

  return html`
    <figure class="chart">
      ${caption ? html`<figcaption class="chart__caption">${caption}</figcaption>` : ''}
      <svg viewBox="0 0 ${width} ${height}" class="chart__svg" aria-hidden="true" focusable="false">${raw(bars)}</svg>
      <table class="sr-only">
        ${caption ? html`<caption>${caption}</caption>` : ''}
        <tr><th scope="col">Kategorie</th><th scope="col">${valueHeader}</th></tr>
        ${rows.map((r) => html`<tr><th scope="row">${r.label}</th><td>${r.display}</td></tr>`)}
      </table>
    </figure>`;
}

/**
 * Liniendiagramm mit mehreren Serien.
 * @param {string[]} xLabels
 * @param {{name:string, values:number[], tone:string}[]} series
 */
export function lineChart(xLabels, series, { caption, yMax } = {}) {
  const width = 560;
  const height = 220;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(1, yMax ?? Math.max(...series.flatMap((s) => s.values)));
  const x = (i) => pad.l + (xLabels.length === 1 ? innerW / 2 : (i / (xLabels.length - 1)) * innerW);
  const y = (v) => pad.t + innerH - (v / max) * innerH;

  const grid = [0, 0.5, 1].map((f) => {
    const v = Math.round(max * f);
    return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(v)}" y2="${y(v)}" class="chart__grid"/>
            <text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" class="chart__tick">${v}</text>`;
  }).join('');
  const step = Math.ceil(xLabels.length / 6);
  const ticks = xLabels.map((l, i) => (i % step === 0 || i === xLabels.length - 1)
    ? `<text x="${x(i)}" y="${height - 8}" text-anchor="middle" class="chart__tick">${escapeHtml(l)}</text>` : '').join('');
  const lines = series.map((s) => {
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<path d="${d}" class="chart__line chart__line--${s.tone}"/>`;
  }).join('');

  return html`
    <figure class="chart">
      ${caption ? html`<figcaption class="chart__caption">${caption}</figcaption>` : ''}
      <svg viewBox="0 0 ${width} ${height}" class="chart__svg" aria-hidden="true" focusable="false">${raw(grid + ticks + lines)}</svg>
      <ul class="chart__legend">
        ${series.map((s) => html`<li><span class="swatch swatch--${s.tone}"></span>${s.name}</li>`)}
      </ul>
      <table class="sr-only">
        ${caption ? html`<caption>${caption}</caption>` : ''}
        <tr><th scope="col">Zeit</th>${series.map((s) => html`<th scope="col">${s.name}</th>`)}</tr>
        ${xLabels.map((l, i) => html`<tr><th scope="row">${l}</th>${series.map((s) => html`<td>${s.values[i]}</td>`)}</tr>`)}
      </table>
    </figure>`;
}

/** Ring für den Level-Fortschritt. */
export function progressRing(ratio, label) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, ratio)));
  return html`
    <svg viewBox="0 0 84 84" class="ring" role="img" aria-label="${label}">
      <circle cx="42" cy="42" r="${r}" class="ring__track"/>
      <circle cx="42" cy="42" r="${r}" class="ring__value" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 42 42)"/>
    </svg>`;
}
