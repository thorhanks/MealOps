// Macro Rings — concentric reactor core style macro visualization

const ARC_START = 135;   // degrees — bottom-left (matches body-gauge)
const ARC_SWEEP = 270;   // 270° sweep to bottom-right
const CX = 140;
const CY = 140;
const VIEW = 280;
const SEGMENTS = 20;
const GAP_DEG = 3;
const SEG_DEG = (ARC_SWEEP / SEGMENTS) - GAP_DEG;
const STROKE_W = 11;

// Calorie multipliers
const CAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

// Ring definitions — outer to inner
const RINGS = [
  { key: 'protein', label: 'P', r: 112, colors: ['#003300', '#006600', '#00cc00'], dimColor: '#001a00' },
  { key: 'carbs',   label: 'C', r: 84, colors: ['#664400', '#aa7700', '#ffb000'], dimColor: '#1a1200' },
  { key: 'fat',     label: 'F', r: 56, colors: ['#442200', '#884400', '#cc6600'], dimColor: '#1a0e00' },
];

function polar(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(startDeg, endDeg, r) {
  const s = polar(startDeg, r);
  const e = polar(endDeg, r);
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function segColor(index, total, colors) {
  const ratio = index / (total - 1);
  if (ratio < 0.5) return colors[0];
  if (ratio < 0.8) return colors[1];
  return colors[2];
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

    // Calculate calorie contributions
    const pCal = p * CAL_PER_G.protein;
    const cCal = c * CAL_PER_G.carbs;
    const fCal = f * CAL_PER_G.fat;
    const totalCal = pCal + cCal + fCal;

    const macroGrams = { protein: p, carbs: c, fat: f };
    const macroPcts = totalCal > 0
      ? { protein: pCal / totalCal, carbs: cCal / totalCal, fat: fCal / totalCal }
      : { protein: 0, carbs: 0, fat: 0 };

    // Empty state
    if (totalCal === 0) {
      this.innerHTML = `
        <div class="macro-rings">
          <h3 class="prompt">daily macros</h3>
          <svg class="macro-rings__svg" viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg">
            ${this._renderEmptyRings()}
            <text x="${CX}" y="${CY + 4}" text-anchor="middle"
              fill="#555" font-family="var(--font)" font-size="14">
              no data
            </text>
          </svg>
        </div>
      `;
      return;
    }

    // Build SVG content
    let svgContent = '';

    // Background tracks for each ring
    for (const ring of RINGS) {
      svgContent += `<path d="${arcPath(ARC_START, ARC_START + ARC_SWEEP, ring.r)}" fill="none" stroke="#1a1a1a" stroke-width="${STROKE_W + 3}" stroke-linecap="butt" />\n`;
    }

    // Inner dashed reference ring
    const innerR = RINGS[2].r - STROKE_W / 2 - 6;
    svgContent += `<path d="${arcPath(ARC_START, ARC_START + ARC_SWEEP, innerR)}" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="2 3" />\n`;

    // Outer dashed reference ring
    const outerR = RINGS[0].r + STROKE_W / 2 + 6;
    svgContent += `<path d="${arcPath(ARC_START, ARC_START + ARC_SWEEP, outerR)}" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="2 3" />\n`;

    // Segments for each ring
    for (const ring of RINGS) {
      const fillRatio = macroPcts[ring.key];
      const litCount = Math.round(fillRatio * SEGMENTS);

      for (let i = 0; i < SEGMENTS; i++) {
        const a0 = ARC_START + i * (SEG_DEG + GAP_DEG);
        const a1 = a0 + SEG_DEG;
        const lit = i < litCount;
        const color = lit ? segColor(i, SEGMENTS, ring.colors) : ring.dimColor;
        const opacity = lit ? 1 : 0.15;

        svgContent += `<path d="${arcPath(a0, a1, ring.r)}" fill="none" stroke="${color}" stroke-width="${STROKE_W}" stroke-linecap="butt" opacity="${opacity}" style="transition:opacity .3s" />\n`;
      }
    }

    // Tick marks on outer ring only
    const tickDefs = [
      { pct: 0, lbl: '0' },
      { pct: 50, lbl: '' },
      { pct: 100, lbl: '100' },
    ];

    for (const t of tickDefs) {
      const angle = ARC_START + (t.pct / 100) * ARC_SWEEP;
      const isMajor = t.lbl !== '';
      const rInner = RINGS[0].r + STROKE_W / 2 + 1;
      const rOuter = RINGS[0].r + STROKE_W / 2 + (isMajor ? 10 : 6);
      const p1 = polar(angle, rInner);
      const p2 = polar(angle, rOuter);

      svgContent += `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="#444" stroke-width="1" />\n`;

      if (isMajor) {
        const lp = polar(angle, rOuter + 10);
        svgContent += `<text x="${lp.x.toFixed(2)}" y="${lp.y.toFixed(2)}" fill="#555" font-family="var(--font)" font-size="10" text-anchor="middle" dominant-baseline="central">${t.lbl}</text>\n`;
      }
    }

    // Center readout — stacked macro values
    const pPct = Math.round(macroPcts.protein * 100);
    const cPct = Math.round(macroPcts.carbs * 100);
    const fPct = Math.round(macroPcts.fat * 100);

    svgContent += `
      <text x="${CX}" y="${CY - 20}" text-anchor="middle" fill="#00cc00" font-family="var(--font)" font-size="14" font-weight="bold">P:${p}g</text>
      <text x="${CX}" y="${CY + 1}" text-anchor="middle" fill="#ffb000" font-family="var(--font)" font-size="14" font-weight="bold">C:${c}g</text>
      <text x="${CX}" y="${CY + 22}" text-anchor="middle" fill="#cc6600" font-family="var(--font)" font-size="14" font-weight="bold">F:${f}g</text>
    `;

    this.innerHTML = `
      <div class="macro-rings">
        <h3 class="prompt">daily macros</h3>
        <svg class="macro-rings__svg" viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg">
          ${svgContent}
        </svg>
      </div>
    `;
  }

  _renderEmptyRings() {
    let svg = '';
    for (const ring of RINGS) {
      svg += `<path d="${arcPath(ARC_START, ARC_START + ARC_SWEEP, ring.r)}" fill="none" stroke="#1a1a1a" stroke-width="${STROKE_W + 2}" stroke-linecap="butt" />\n`;
      for (let i = 0; i < SEGMENTS; i++) {
        const a0 = ARC_START + i * (SEG_DEG + GAP_DEG);
        const a1 = a0 + SEG_DEG;
        svg += `<path d="${arcPath(a0, a1, ring.r)}" fill="none" stroke="${ring.dimColor}" stroke-width="${STROKE_W}" stroke-linecap="butt" opacity="0.15" />\n`;
      }
    }
    return svg;
  }
}

customElements.define('macro-pie', MacroPie);

export default MacroPie;
