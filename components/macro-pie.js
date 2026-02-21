// Macro Triangle — radar triangle showing macro calorie balance

const VIEW_W = 380;
const VIEW_H = 320;
const CX = 190;
const CY = 165;
const R = 120;            // radius of the triangle (center to vertex)
const GRID_RINGS = 4;     // concentric reference triangles
const LERP_DURATION = 300; // ms

// Calorie multipliers
const CAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

// Macro definitions — vertices at 120° apart, starting from top
const MACROS = [
  { key: 'protein', label: 'Protein', color: '#c89664', angle: -90 },
  { key: 'carbs',   label: 'Carbs',   color: '#ffb000', angle: 30 },
  { key: 'fat',     label: 'Fat',     color: '#cc6600', angle: 150 },
];

function polar(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function trianglePath(r) {
  const pts = MACROS.map(m => polar(m.angle, r));
  return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} L ${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)} L ${pts[2].x.toFixed(2)} ${pts[2].y.toFixed(2)} Z`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

class MacroPie extends HTMLElement {
  constructor() {
    super();
    this._data = null;
    this._displayData = { protein: 0, carbs: 0, fat: 0 };
    this._prevData = { protein: 0, carbs: 0, fat: 0 };
    this._lerpId = null;
  }

  set data(value) {
    this._data = value;
    if (this.isConnected) this._animateTo(value);
  }

  connectedCallback() {
    if (this._data) {
      this._displayData = { ...this._data };
      this._prevData = { ...this._data };
    }
    this.render();
  }

  _animateTo(target) {
    if (this._lerpId) cancelAnimationFrame(this._lerpId);

    const from = { ...this._displayData };
    const to = { protein: target.protein || 0, carbs: target.carbs || 0, fat: target.fat || 0 };
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / LERP_DURATION);
      // Ease-out quad
      const ease = 1 - (1 - t) * (1 - t);

      this._displayData = {
        protein: lerp(from.protein, to.protein, ease),
        carbs: lerp(from.carbs, to.carbs, ease),
        fat: lerp(from.fat, to.fat, ease),
      };

      this.render();

      if (t < 1) {
        this._lerpId = requestAnimationFrame(tick);
      } else {
        this._lerpId = null;
        this._prevData = { ...to };
      }
    };

    this._lerpId = requestAnimationFrame(tick);
  }

  render() {
    const d = this._displayData;
    const p = Math.round(d.protein);
    const c = Math.round(d.carbs);
    const f = Math.round(d.fat);

    const pCal = p * CAL_PER_G.protein;
    const cCal = c * CAL_PER_G.carbs;
    const fCal = f * CAL_PER_G.fat;
    const totalCal = pCal + cCal + fCal;

    // Empty state
    if (totalCal === 0) {
      this.innerHTML = `
        <div class="macro-rings">
          <svg class="macro-rings__svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Daily macros: no data">
            ${this._renderGrid()}
            <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central"
              fill="#555" font-family="var(--font)" font-size="18">
              no data
            </text>
            <text x="${CX}" y="${VIEW_H - 10}" text-anchor="middle" fill="#665500" font-family="var(--font)" font-size="14">daily macros</text>
          </svg>
        </div>
      `;
      return;
    }

    const pcts = {
      protein: pCal / totalCal,
      carbs: cCal / totalCal,
      fat: fCal / totalCal,
    };

    let svg = '';

    // Grid: concentric reference triangles + spokes
    svg += this._renderGrid();

    // Data polygon
    const dataPoints = MACROS.map(m => {
      const ratio = pcts[m.key];
      return polar(m.angle, ratio * R);
    });

    const dataPath = `M ${dataPoints[0].x.toFixed(2)} ${dataPoints[0].y.toFixed(2)} L ${dataPoints[1].x.toFixed(2)} ${dataPoints[1].y.toFixed(2)} L ${dataPoints[2].x.toFixed(2)} ${dataPoints[2].y.toFixed(2)} Z`;

    // Filled polygon
    svg += `<path d="${dataPath}" fill="#ffb000" fill-opacity="0.08" stroke="none" />\n`;

    // Segmented edges
    for (let i = 0; i < MACROS.length; i++) {
      const from = dataPoints[i];
      const to = dataPoints[(i + 1) % MACROS.length];
      const edgeColor = MACROS[(i + 1) % MACROS.length].color;
      svg += this._segmentedLine(from, to, edgeColor, 8);
    }

    // Vertex dots
    for (let i = 0; i < MACROS.length; i++) {
      const pt = dataPoints[i];
      svg += `<circle cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="4" fill="${MACROS[i].color}" />\n`;
    }

    // Spokes through data
    for (let i = 0; i < MACROS.length; i++) {
      const pt = dataPoints[i];
      svg += `<line x1="${CX}" y1="${CY}" x2="${pt.x.toFixed(2)}" y2="${pt.y.toFixed(2)}" stroke="${MACROS[i].color}" stroke-width="1" opacity="0.3" />\n`;
    }

    // Axis labels
    const grams = { protein: p, carbs: c, fat: f };
    for (const m of MACROS) {
      const lp = polar(m.angle, R + 20);
      const pctVal = Math.round(pcts[m.key] * 100);
      const anchor = 'middle';
      const dy = m.angle === -90 ? -1 : 1;
      svg += `<text x="${lp.x.toFixed(2)}" y="${lp.y.toFixed(2)}" fill="${m.color}" font-family="var(--font)" font-size="14" font-weight="bold" text-anchor="${anchor}" dominant-baseline="central">${m.label}:${pctVal}%</text>\n`;
      svg += `<text x="${lp.x.toFixed(2)}" y="${(lp.y + dy * 16).toFixed(2)}" fill="${m.color}" font-family="var(--font)" font-size="12" text-anchor="${anchor}" dominant-baseline="central">${grams[m.key]}g</text>\n`;
    }

    this.innerHTML = `
      <div class="macro-rings">
        <svg class="macro-rings__svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Daily macros: protein ${p}g (${Math.round(pcts.protein * 100)}%), carbs ${c}g (${Math.round(pcts.carbs * 100)}%), fat ${f}g (${Math.round(pcts.fat * 100)}%)">
          ${svg}
          <text x="${CX}" y="${VIEW_H - 10}" text-anchor="middle" fill="#665500" font-family="var(--font)" font-size="14">daily macros</text>
        </svg>
      </div>
    `;
  }

  _renderGrid() {
    let svg = '';

    // Concentric reference triangles
    for (let i = 1; i <= GRID_RINGS; i++) {
      const r = (i / GRID_RINGS) * R;
      svg += `<path d="${trianglePath(r)}" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="${i === GRID_RINGS ? 'none' : '2 3'}" />\n`;
    }

    // Spoke lines from center to each vertex
    for (const m of MACROS) {
      const vx = polar(m.angle, R);
      svg += `<line x1="${CX}" y1="${CY}" x2="${vx.x.toFixed(2)}" y2="${vx.y.toFixed(2)}" stroke="#222" stroke-width="1" />\n`;
    }

    // Tick marks along spokes
    for (const m of MACROS) {
      for (let i = 1; i <= GRID_RINGS; i++) {
        const r = (i / GRID_RINGS) * R;
        const tp = polar(m.angle, r);
        const perpAngle = m.angle + 90;
        const t1 = { x: tp.x + 4 * Math.cos(perpAngle * Math.PI / 180), y: tp.y + 4 * Math.sin(perpAngle * Math.PI / 180) };
        const t2 = { x: tp.x - 4 * Math.cos(perpAngle * Math.PI / 180), y: tp.y - 4 * Math.sin(perpAngle * Math.PI / 180) };
        svg += `<line x1="${t1.x.toFixed(2)}" y1="${t1.y.toFixed(2)}" x2="${t2.x.toFixed(2)}" y2="${t2.y.toFixed(2)}" stroke="#333" stroke-width="1" />\n`;
      }
    }

    return svg;
  }

  _segmentedLine(from, to, color, segments) {
    let svg = '';
    const gap = 0.06;
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments + gap / 2;
      const t1 = (i + 1) / segments - gap / 2;
      const x0 = from.x + (to.x - from.x) * t0;
      const y0 = from.y + (to.y - from.y) * t0;
      const x1 = from.x + (to.x - from.x) * t1;
      const y1 = from.y + (to.y - from.y) * t1;
      svg += `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" stroke="${color}" stroke-width="3" stroke-linecap="butt" />\n`;
    }
    return svg;
  }
}

customElements.define('macro-pie', MacroPie);

export default MacroPie;
