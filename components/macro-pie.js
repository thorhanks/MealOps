// Macro Arc — single stacked arc showing macro calorie split

const ARC_START = 135;   // degrees — bottom-left (matches body-gauge)
const ARC_SWEEP = 270;   // 270° sweep to bottom-right
const CX = 140;
const CY = 140;
const VIEW = 280;
const TOTAL_SEGS = 30;   // total segments across the full arc
const GAP_DEG = 2.5;
const STROKE_W = 14;
const R = 106;

// Calorie multipliers
const CAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

// Macro definitions — draw order
const MACROS = [
  { key: 'protein', label: 'P', color: '#c89664', dimColor: '#5a3e28', trackColor: '#1a1008' },
  { key: 'carbs',   label: 'C', color: '#ffb000', dimColor: '#664400', trackColor: '#1a1200' },
  { key: 'fat',     label: 'F', color: '#cc6600', dimColor: '#884400', trackColor: '#1a0e00' },
];

function polar(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function polarR(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(startDeg, endDeg, r = R) {
  const s = polarR(startDeg, r);
  const e = polarR(endDeg, r);
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

class MacroPie extends HTMLElement {
  constructor() {
    super();
    this._data = null;
  }

  set data(value) {
    this._data = value;
    if (this.isConnected) this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const d = this._data || { protein: 0, carbs: 0, fat: 0 };
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
          <svg class="macro-rings__svg" viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg">
            ${this._renderEmpty()}
            <text x="${CX}" y="${CY + 4}" text-anchor="middle"
              fill="#555" font-family="var(--font)" font-size="14">
              no data
            </text>
          </svg>
          <h3 class="prompt">daily macros</h3>
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

    // Background track
    svg += `<path d="${arcPath(ARC_START, ARC_START + ARC_SWEEP)}" fill="none" stroke="#1a1a1a" stroke-width="${STROKE_W + 2}" stroke-linecap="butt" />\n`;

    // Inner reference ring
    const innerR = R - STROKE_W / 2 - 6;
    svg += `<path d="${arcPath(ARC_START, ARC_START + ARC_SWEEP, innerR)}" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="3 3" />\n`;

    // Compute segment count per macro (proportional to calorie share)
    const segDeg = (ARC_SWEEP / TOTAL_SEGS) - GAP_DEG;
    const segCounts = this._allocateSegments(pcts);

    // Draw segments — stacked end-to-end
    let segIndex = 0;
    for (const macro of MACROS) {
      const count = segCounts[macro.key];
      for (let i = 0; i < count; i++) {
        const a0 = ARC_START + segIndex * (segDeg + GAP_DEG);
        const a1 = a0 + segDeg;
        svg += `<path d="${arcPath(a0, a1)}" fill="none" stroke="${macro.color}" stroke-width="${STROKE_W}" stroke-linecap="butt" opacity="1" style="transition:opacity .3s" />\n`;
        segIndex++;
      }
    }

    // Dim remaining segments (if rounding leaves gaps)
    while (segIndex < TOTAL_SEGS) {
      const a0 = ARC_START + segIndex * (segDeg + GAP_DEG);
      const a1 = a0 + segDeg;
      svg += `<path d="${arcPath(a0, a1)}" fill="none" stroke="#1a1a1a" stroke-width="${STROKE_W}" stroke-linecap="butt" opacity="0.15" />\n`;
      segIndex++;
    }

    // Section divider ticks between macros
    let cumPct = 0;
    for (let i = 0; i < MACROS.length - 1; i++) {
      cumPct += pcts[MACROS[i].key];
      const angle = ARC_START + cumPct * ARC_SWEEP;
      const p1 = polarR(angle, R - STROKE_W / 2 - 4);
      const p2 = polarR(angle, R + STROKE_W / 2 + 4);
      svg += `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="#888" stroke-width="2" />\n`;
    }

    // Endpoint ticks
    const startP1 = polarR(ARC_START, R - STROKE_W / 2 - 4);
    const startP2 = polarR(ARC_START, R + STROKE_W / 2 + 8);
    svg += `<line x1="${startP1.x.toFixed(2)}" y1="${startP1.y.toFixed(2)}" x2="${startP2.x.toFixed(2)}" y2="${startP2.y.toFixed(2)}" stroke="#555" stroke-width="1" />\n`;
    const endP1 = polarR(ARC_START + ARC_SWEEP, R - STROKE_W / 2 - 4);
    const endP2 = polarR(ARC_START + ARC_SWEEP, R + STROKE_W / 2 + 8);
    svg += `<line x1="${endP1.x.toFixed(2)}" y1="${endP1.y.toFixed(2)}" x2="${endP2.x.toFixed(2)}" y2="${endP2.y.toFixed(2)}" stroke="#555" stroke-width="1" />\n`;

    // Percentage labels at midpoint of each section
    cumPct = 0;
    for (const macro of MACROS) {
      const midPct = cumPct + pcts[macro.key] / 2;
      const angle = ARC_START + midPct * ARC_SWEEP;
      const lp = polarR(angle, R + STROKE_W / 2 + 16);
      const pctVal = Math.round(pcts[macro.key] * 100);
      if (pctVal > 0) {
        svg += `<text x="${lp.x.toFixed(2)}" y="${lp.y.toFixed(2)}" fill="${macro.color}" font-family="var(--font)" font-size="10" text-anchor="middle" dominant-baseline="central">${pctVal}%</text>\n`;
      }
      cumPct += pcts[macro.key];
    }

    // Center readout
    svg += `
      <text x="${CX}" y="${CY - 20}" text-anchor="middle" fill="#c89664" font-family="var(--font)" font-size="14" font-weight="bold">P:${p}g</text>
      <text x="${CX}" y="${CY + 1}" text-anchor="middle" fill="#ffb000" font-family="var(--font)" font-size="14" font-weight="bold">C:${c}g</text>
      <text x="${CX}" y="${CY + 22}" text-anchor="middle" fill="#cc6600" font-family="var(--font)" font-size="14" font-weight="bold">F:${f}g</text>
    `;

    this.innerHTML = `
      <div class="macro-rings">
        <svg class="macro-rings__svg" viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg">
          ${svg}
        </svg>
        <h3 class="prompt">daily macros</h3>
      </div>
    `;
  }

  _allocateSegments(pcts) {
    // Largest-remainder method for fair rounding
    const raw = {};
    const floors = {};
    let used = 0;
    for (const m of MACROS) {
      raw[m.key] = pcts[m.key] * TOTAL_SEGS;
      floors[m.key] = Math.floor(raw[m.key]);
      used += floors[m.key];
    }
    let remaining = TOTAL_SEGS - used;
    const remainders = MACROS.map(m => ({ key: m.key, r: raw[m.key] - floors[m.key] }))
      .sort((a, b) => b.r - a.r);
    for (const entry of remainders) {
      if (remaining <= 0) break;
      floors[entry.key]++;
      remaining--;
    }
    return floors;
  }

  _renderEmpty() {
    let svg = '';
    const segDeg = (ARC_SWEEP / TOTAL_SEGS) - GAP_DEG;
    svg += `<path d="${arcPath(ARC_START, ARC_START + ARC_SWEEP)}" fill="none" stroke="#1a1a1a" stroke-width="${STROKE_W + 2}" stroke-linecap="butt" />\n`;
    for (let i = 0; i < TOTAL_SEGS; i++) {
      const a0 = ARC_START + i * (segDeg + GAP_DEG);
      const a1 = a0 + segDeg;
      svg += `<path d="${arcPath(a0, a1)}" fill="none" stroke="#1a1a1a" stroke-width="${STROKE_W}" stroke-linecap="butt" opacity="0.15" />\n`;
    }
    return svg;
  }
}

customElements.define('macro-pie', MacroPie);

export default MacroPie;
