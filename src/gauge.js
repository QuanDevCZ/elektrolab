// Ručkový měřicí přístroj (SVG): siloměr, „intenzitoměr“ v bodě P nebo voltmetr.
// Jen kreslení — hodnota a stupnice přicházejí hotové z main.js.

import { formatNumber, superscript } from './core/format.js';

const NS = 'http://www.w3.org/2000/svg';
const A0 = -100, A1 = 100; // rozsah ručky ve stupních (0 = svisle nahoru)

const polar = (cx, cy, r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

export function createGauge(el) {
  el.innerHTML = `
    <svg viewBox="0 0 240 154" class="gauge-svg" role="img">
      <path class="g-arc" d=""/>
      <g class="g-ticks"></g>
      <g class="g-needle"><line x1="120" y1="120" x2="120" y2="34"/><circle cx="120" cy="120" r="6"/></g>
      <text class="g-name" x="120" y="146" text-anchor="middle"></text>
    </svg>
    <div class="gauge-read"><b class="g-value"></b><span class="g-note"></span></div>`;
  const svg = el.querySelector('svg');
  const ticksG = svg.querySelector('.g-ticks');
  const needle = svg.querySelector('.g-needle');
  let scaleKey = '';

  const [ax, ay] = polar(120, 120, 92, A0), [bx, by] = polar(120, 120, 92, A1);
  svg.querySelector('.g-arc').setAttribute('d', `M ${ax} ${ay} A 92 92 0 1 1 ${bx} ${by}`);

  // spec: { name, min, max, log, value, text, note, ticks: [{ v, label }] }
  function set(spec) {
    const t = (v) => {
      if (spec.log) {
        const x = Math.log10(Math.max(Math.abs(v), 10 ** (spec.min - 2)));
        return (x - spec.min) / (spec.max - spec.min);
      }
      return (v - spec.min) / (spec.max - spec.min);
    };
    const key = JSON.stringify([spec.name, spec.min, spec.max, spec.log]);
    if (key !== scaleKey) {
      scaleKey = key;
      svg.querySelector('.g-name').textContent = spec.name;
      ticksG.innerHTML = '';
      const ticks = spec.ticks || defaultTicks(spec);
      for (const tk of ticks) {
        const deg = A0 + (A1 - A0) * t(tk.v);
        const [x1, y1] = polar(120, 120, 92, deg), [x2, y2] = polar(120, 120, 82, deg), [lx, ly] = polar(120, 120, 68, deg);
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        ticksG.append(line);
        if (tk.label) {
          const tx = document.createElementNS(NS, 'text');
          tx.setAttribute('x', lx); tx.setAttribute('y', ly + 4);
          tx.setAttribute('text-anchor', 'middle');
          tx.textContent = tk.label;
          ticksG.append(tx);
        }
      }
    }
    const f = Math.max(-0.03, Math.min(1.03, t(spec.value)));
    needle.style.transform = `rotate(${A0 + (A1 - A0) * f}deg)`;
    el.querySelector('.g-value').textContent = spec.text;
    el.querySelector('.g-note').textContent = spec.note || '';
  }

  return { set };
}

function defaultTicks(spec) {
  const out = [];
  if (spec.log) {
    const every = Math.max(1, Math.ceil((spec.max - spec.min) / 6));
    for (let e = spec.min; e <= spec.max; e++) out.push({ v: 10 ** e, label: (e - spec.min) % every === 0 ? `10${superscript(e)}` : '' });
    return out;
  }
  const n = 4;
  for (let i = 0; i <= n; i++) {
    const v = spec.min + ((spec.max - spec.min) * i) / n;
    out.push({ v, label: formatNumber(v, 2) });
  }
  return out;
}
