// Body Gauge — circular reactor core style calorie gauge

const SEGMENTS = 30;
const ARC_START = 135;   // degrees — bottom-left
const ARC_SWEEP = 270;   // 270° sweep to bottom-right
const GAP_DEG = 2.5;
const SEG_DEG = (ARC_SWEEP / SEGMENTS) - GAP_DEG;

const CX = 140;
const CY = 140;
const R = 106;
const STROKE_W = 14;
const VIEW = 280;

function polar(angleDeg, r = R) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(startDeg, endDeg, r = R) {
  const s = polar(startDeg, r);
  const e = polar(endDeg, r);
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function segColor(index, total, over) {
  const ratio = index / (total - 1);
  if (over) {
    if (ratio < 0.5) return '#661a00';
    if (ratio < 0.8) return '#993300';
    return '#cc3300';
  }
  if (ratio < 0.5) return '#664400';
  if (ratio < 0.8) return '#aa7700';
  return '#ffb000';
}

class BodyGauge extends HTMLElement {
  static get observedAttributes() {
    return ['current', 'target', 'label'];
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }

  render() {
    const current = parseFloat(this.getAttribute('current')) || 0;
    const target = parseFloat(this.getAttribute('target')) || 1;
    const label = this.getAttribute('label') || 'kcal';

    const pct = Math.round((current / target) * 100);
    const fillRatio = Math.min(1, current / target);
    const litCount = Math.round(fillRatio * SEGMENTS);
    const isOver = pct > 100;

    // Background track — full arc, very dim
    const trackPath = arcPath(ARC_START, ARC_START + ARC_SWEEP);
    const track = `<path d="${trackPath}" fill="none" stroke="#1a1a1a" stroke-width="${STROKE_W + 2}" stroke-linecap="butt" />`;

    // Inner reference ring — dashed
    const innerR = R - STROKE_W / 2 - 6;
    const innerRing = `<path d="${arcPath(ARC_START, ARC_START + ARC_SWEEP, innerR)}" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="3 3" />`;

    // Segments
    const segs = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const a0 = ARC_START + i * (SEG_DEG + GAP_DEG);
      const a1 = a0 + SEG_DEG;
      const lit = i < litCount;
      const color = segColor(i, SEGMENTS, isOver && lit);

      segs.push(
        `<path d="${arcPath(a0, a1)}" fill="none" stroke="${color}" stroke-width="${STROKE_W}" stroke-linecap="butt" opacity="${lit ? 1 : 0.12}" style="transition:opacity .3s" />`
      );
    }

    // Tick marks at 0%, 25%, 50%, 75%, 100%
    const ticks = [];
    const tickDefs = [
      { pct: 0,   lbl: '0' },
      { pct: 25,  lbl: '' },
      { pct: 50,  lbl: '50' },
      { pct: 75,  lbl: '' },
      { pct: 100, lbl: '100' },
    ];

    for (const t of tickDefs) {
      const angle = ARC_START + (t.pct / 100) * ARC_SWEEP;
      const isMajor = t.lbl !== '';
      const rInner = R + STROKE_W / 2 + 1;
      const rOuter = R + STROKE_W / 2 + (isMajor ? 11 : 7);
      const p1 = polar(angle, rInner);
      const p2 = polar(angle, rOuter);

      ticks.push(
        `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="#555" stroke-width="1" />`
      );

      if (isMajor) {
        const lp = polar(angle, rOuter + 11);
        ticks.push(
          `<text x="${lp.x.toFixed(2)}" y="${lp.y.toFixed(2)}" fill="#665500" font-family="var(--font)" font-size="11" text-anchor="middle" dominant-baseline="central">${t.lbl}</text>`
        );
      }
    }

    // Redline marker at 100%
    const redAngle = ARC_START + ARC_SWEEP;
    const rl1 = polar(redAngle, R - STROKE_W / 2 - 4);
    const rl2 = polar(redAngle, R + STROKE_W / 2 + 4);
    const redline = `<line x1="${rl1.x.toFixed(2)}" y1="${rl1.y.toFixed(2)}" x2="${rl2.x.toFixed(2)}" y2="${rl2.y.toFixed(2)}" stroke="${isOver ? '#cc3300' : '#aa7700'}" stroke-width="2" />`;

    // Center readout
    const numColor = isOver ? '#cc3300' : '#ffb000';
    const centerText = `
      <text x="${CX}" y="${CY - 14}" text-anchor="middle" fill="${numColor}" font-family="var(--font)" font-size="34" font-weight="bold">${Math.round(current)}</text>
      <text x="${CX}" y="${CY + 11}" text-anchor="middle" fill="#665500" font-family="var(--font)" font-size="14">/ ${Math.round(target)} ${label}</text>
      <text x="${CX}" y="${CY + 34}" text-anchor="middle" fill="${numColor}" font-family="var(--font)" font-size="18">${pct}%</text>
      <text x="${CX}" y="${VIEW - 6}" text-anchor="middle" fill="#665500" font-family="var(--font)" font-size="12">daily calories</text>
    `;

    this.innerHTML = `
      <div class="body-gauge ${isOver ? 'body-gauge--over' : ''}">
        <svg class="body-gauge__svg" viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg">
          ${track}
          ${innerRing}
          ${segs.join('\n          ')}
          ${ticks.join('\n          ')}
          ${redline}
          ${centerText}
        </svg>
      </div>
    `;
  }
}

customElements.define('body-gauge', BodyGauge);

export default BodyGauge;
