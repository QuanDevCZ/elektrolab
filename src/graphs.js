// Grafy v laboratoři (Obr. 2, Obr. 3) — 2D canvas, jen kreslení. Data dodává core/curves.js
// a core/work.js. Styl jako „osciloskop“: tmavá plocha, jemná mřížka, světlá křivka.

import { formatNumber, superscript } from './core/format.js';
import { colorAt } from './core/colormap.js';

const C = {
  bg: '#0d0f13', grid: '#232731', axis: '#3a404c', text: '#8c8676', ink: '#e9e4d8',
  force: '#d98a12', parallel: '#ff5a4a', perpendicular: '#3fd07f', oblique: '#f0b429',
};
const FONT = '11px "IBM Plex Mono", ui-monospace, monospace';
const PAD = { l: 58, r: 14, t: 14, b: 26 };

export function createGraph(canvas) {
  const ctx = canvas.getContext('2d');
  let spec = null;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function draw(next) {
    spec = next;
    if (!spec) return;
    const { w, h } = size();
    if (!w || !h) return;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.font = FONT;
    const box = { x: PAD.l, y: PAD.t, w: w - PAD.l - PAD.r, h: h - PAD.t - PAD.b };
    if (spec.kind === 'force') drawForce(ctx, box, spec);
    else if (spec.kind === 'field') drawField(ctx, box, spec);
    else if (spec.kind === 'work') drawWork(ctx, box, spec);
  }

  new ResizeObserver(() => draw(spec)).observe(canvas);
  return { draw };
}

// ── pomocné ──────────────────────────────────────────────────────────────────
function niceStep(span, target = 5) {
  const raw = span / target, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

function xTicks(ctx, box, x0, x1, sx, unitLabel, scale = 1) {
  const step = niceStep(x1 - x0);
  ctx.fillStyle = C.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = Math.ceil(x0 / step) * step; v <= x1 + step * 1e-6; v += step) {
    const X = sx(v);
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(X, box.y); ctx.lineTo(X, box.y + box.h); ctx.stroke();
    ctx.fillText(formatNumber(v * scale, 3), X, box.y + box.h + 6);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'bottom';
  ctx.fillText(unitLabel, box.x + box.w - 6, box.y + box.h - 4);
}

function frame(ctx, box) {
  ctx.strokeStyle = C.axis;
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
}

function dot(ctx, X, Y, color, hollow = false) {
  ctx.beginPath();
  ctx.arc(X, Y, 4.5, 0, Math.PI * 2);
  if (hollow) { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
  else { ctx.fillStyle = color; ctx.fill(); }
}

function label(ctx, text, X, Y, color = C.ink, align = 'left') {
  ctx.textAlign = align;
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  const bx = align === 'left' ? X : align === 'right' ? X - w : X - w / 2;
  ctx.fillStyle = '#0d0f13cc';
  ctx.fillRect(bx - 3, Y - 15, w + 6, 15);
  ctx.fillStyle = color;
  ctx.fillText(text, X, Y - 2);
}

// ── Obr. 2 (Coulomb): F_e v závislosti na r ───────────────────────────────────
// spec: { curve: [{ r, F }], r, F, rMin }
function drawForce(ctx, box, s) {
  const r0 = s.curve[0].r, r1 = s.curve[s.curve.length - 1].r;
  // osa síly: aktuální síla ve 20 % výšky, ať je vidět i čtyřnásobek při poloviční vzdálenosti
  const yMax = s.F * 5;
  const sx = (r) => box.x + ((r - r0) / (r1 - r0)) * box.w;
  const sy = (F) => box.y + box.h - (Math.min(F, yMax * 1.05) / yMax) * box.h;

  xTicks(ctx, box, r0, r1, sx, 'r [m]');
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const [v, t] of [[0, '0'], [s.F, formatNumber(s.F, 2)], [4 * s.F, formatNumber(4 * s.F, 2)]]) {
    const Y = sy(v);
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(box.x, Y); ctx.lineTo(box.x + box.w, Y); ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.fillText(t, box.x - 6, Y);
  }
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Fₑ [N]', box.x + 6, box.y + 4);
  frame(ctx, box);

  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  ctx.strokeStyle = C.force;
  ctx.lineWidth = 2;
  ctx.beginPath();
  s.curve.forEach((p, i) => (i ? ctx.lineTo(sx(p.r), sy(p.F)) : ctx.moveTo(sx(p.r), sy(p.F))));
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.restore();

  // aktuální bod a „poloviční vzdálenost → čtyřikrát větší síla“
  const X = sx(s.r), Y = sy(s.F);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#e9e4d866';
  ctx.beginPath(); ctx.moveTo(X, box.y + box.h); ctx.lineTo(X, Y); ctx.lineTo(box.x, Y); ctx.stroke();
  ctx.setLineDash([]);
  if (s.r / 2 >= r0) {
    const Xh = sx(s.r / 2), Yh = sy(4 * s.F);
    dot(ctx, Xh, Yh, C.ink, true);
    label(ctx, 'r/2 → 4·F', Xh + 8, Yh + 4, C.text);
  }
  dot(ctx, X, Y, C.ink);
  label(ctx, `Fₑ = ${formatNumber(s.F, 3)} N`, Math.min(X + 8, box.x + box.w - 130), Y - 6);
}

// ── Obr. 2/3 (pole): |E| podél úsečky, logaritmicky, barvou stupnice ──────────
// spec: { profile: [{ s, E }], range: { lo, hi }, x0, xLabel, marks: [{ s, text }] }
function drawField(ctx, box, s) {
  const p = s.profile, L = p[p.length - 1].s, x0 = s.x0 ?? 0;
  const { lo, hi } = s.range;
  const sx = (v) => box.x + (v / L) * box.w;
  const sy = (E) => {
    const t = (Math.log10(Math.max(E, 10 ** (lo - 1))) - lo) / (hi - lo);
    return box.y + box.h - Math.max(-0.02, Math.min(1.02, t)) * box.h;
  };
  xTicks(ctx, box, x0, x0 + L, (v) => sx(v - x0), s.xLabel);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const every = Math.max(1, Math.ceil((hi - lo) / 5));
  for (let e = lo; e <= hi; e += every) {
    const Y = sy(10 ** e);
    ctx.strokeStyle = C.grid;
    ctx.beginPath(); ctx.moveTo(box.x, Y); ctx.lineTo(box.x + box.w, Y); ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.fillText(`10${superscript(e)}`, box.x - 6, Y);
  }
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('|E| [V·m⁻¹]', box.x + 6, box.y + 4);
  frame(ctx, box);

  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  ctx.lineWidth = 2.2;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i];
    if (a.E == null || b.E == null) continue;
    const [r, g, bl] = colorAt((a.E + b.E) / 2, s.range);
    ctx.strokeStyle = `rgb(${r * 255 | 0},${g * 255 | 0},${bl * 255 | 0})`;
    ctx.beginPath(); ctx.moveTo(sx(a.s), sy(a.E)); ctx.lineTo(sx(b.s), sy(b.E)); ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.restore();

  for (const m of s.marks || []) {
    const X = sx(m.s);
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#e9e4d866';
    ctx.beginPath(); ctx.moveTo(X, box.y); ctx.lineTo(X, box.y + box.h); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, m.text, Math.min(Math.max(X + 4, box.x + 2), box.x + box.w - 150), box.y + 34, m.color || C.ink);
  }
}

// ── Obr. 2 (práce): práce vykonaná od A podél zvolené cesty ───────────────────
// spec: { profile: [{ s, W }], segments: [{ s, kind }], Wmax, progress (0 … 1), W }
function drawWork(ctx, box, s) {
  const p = s.profile, L = p[p.length - 1].s || 1;
  const Wmax = s.Wmax || 1;
  const sx = (v) => box.x + (v / L) * box.w;
  const sy = (W) => box.y + box.h / 2 - (W / Wmax) * (box.h / 2) * 0.9;
  xTicks(ctx, box, 0, L, sx, 'dráha s [cm]', 100);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of [-Wmax, 0, Wmax]) {
    const Y = sy(v);
    ctx.strokeStyle = v === 0 ? C.axis : C.grid;
    ctx.beginPath(); ctx.moveTo(box.x, Y); ctx.lineTo(box.x + box.w, Y); ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.fillText(formatNumber(v, 2), box.x - 6, Y);
  }
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('W [J]', box.x + 6, box.y + 4);
  frame(ctx, box);

  // barva podle úseku cesty: červená po siločarách, zelená kolmo (rovná čára = žádná práce)
  const bounds = [];
  let acc = 0;
  for (const seg of s.segments) { bounds.push({ from: acc, to: acc + seg.s, kind: seg.kind }); acc += seg.s; }
  const kindAt = (v) => (bounds.find((b) => v <= b.to + 1e-12) || bounds[bounds.length - 1] || { kind: 'oblique' }).kind;
  const upto = (s.progress ?? 1) * L;
  ctx.lineWidth = 2.2;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i];
    ctx.globalAlpha = b.s <= upto + 1e-9 ? 1 : 0.25;
    ctx.strokeStyle = C[kindAt((a.s + b.s) / 2)];
    ctx.beginPath(); ctx.moveTo(sx(a.s), sy(a.W)); ctx.lineTo(sx(b.s), sy(b.W)); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;

  const i = Math.min(p.length - 1, Math.round((s.progress ?? 1) * (p.length - 1)));
  dot(ctx, sx(p[i].s), sy(p[i].W), C.ink);
  label(ctx, `W = ${formatNumber(p[i].W, 3)} J`, Math.min(sx(p[i].s) + 8, box.x + box.w - 120), sy(p[i].W) - 6);
}
