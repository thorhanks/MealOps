// Weekly Trend — radial sector display / radar diagnostics

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SEGMENTS = 12;
const CX = 154;
const CY = 154;
const VIEW = 308;
const R_INNER = 34;
const R_OUTER = 115;
const RING_H = (R_OUTER - R_INNER) / SEGMENTS;
const SPOKE_ANGLE = 360 / 7; // ~51.43° per wedge
const ARC_GAP = 1.5; // degrees gap between wedges (on each side)
const RING_GAP = 1; // px radial gap between rings

// Start from top (12 o'clock) and go clockwise
const START_ANGLE = -90;

function polar(angleDeg, r) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcSectorPath(aStart, aEnd, rInner, rOuter) {
  // Draw a donut sector: inner arc → line to outer → outer arc back → close
  const iS = polar(aStart, rInner);
  const iE = polar(aEnd, rInner);
  const oS = polar(aStart, rOuter);
  const oE = polar(aEnd, rOuter);
  const sweep = aEnd - aStart;
  const large = sweep > 180 ? 1 : 0;

  return [
    `M ${iS.x.toFixed(2)} ${iS.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${iE.x.toFixed(2)} ${iE.y.toFixed(2)}`,
    `L ${oE.x.toFixed(2)} ${oE.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${oS.x.toFixed(2)} ${oS.y.toFixed(2)}`,
    'Z',
  ].join(' ');
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

class WeeklyTrend extends HTMLElement {
  constructor() {
    super();
    this._data = null;
    this._weekLabel = '';
  }

  set data(value) {
    this._data = value;
    if (this.isConnected) this.render();
  }

  set weekLabel(value) {
    this._weekLabel = value;
    if (this.isConnected) this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const data = this._data;


    if (!data || data.length === 0) {
      this.innerHTML = `
        <div class="weekly-trend">
          <div class="weekly-trend__empty">no data</div>
        </div>
      `;
      return;
    }

    let svg = '';

    // Background reference rings
    svg += `<circle cx="${CX}" cy="${CY}" r="${R_INNER - 3}" fill="none" stroke="#1a1a1a" stroke-width="1" stroke-dasharray="2 3" />\n`;
    svg += `<circle cx="${CX}" cy="${CY}" r="${R_OUTER + 3}" fill="none" stroke="#222" stroke-width="1" stroke-dasharray="2 3" />\n`;

    // 100% target circle
    svg += `<circle cx="${CX}" cy="${CY}" r="${R_OUTER}" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="3 4" />\n`;

    // Spoke divider lines — thin radial lines between wedges
    for (let i = 0; i < 7; i++) {
      const angle = START_ANGLE + i * SPOKE_ANGLE;
      const p1 = polar(angle, R_INNER - 3);
      const p2 = polar(angle, R_OUTER + 35);
      svg += `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="#222" stroke-width="1" />\n`;
    }

    // Wedge sectors
    for (let i = 0; i < data.length && i < 7; i++) {
      const d = data[i];
      const wedgeStart = START_ANGLE + i * SPOKE_ANGLE + ARC_GAP;
      const wedgeEnd = START_ANGLE + (i + 1) * SPOKE_ANGLE - ARC_GAP;
      const pct = d.target > 0 ? d.calories / d.target : 0;
      const cappedPct = Math.min(pct, 1.2);
      const litCount = Math.round(cappedPct * SEGMENTS);
      const isOver = pct > 1;
      const isSelected = d.isSelected;

      // Wedge background
      const bgColor = '#2a1f00';
      const bgPath = arcSectorPath(wedgeStart, wedgeEnd, R_INNER, R_OUTER);
      svg += `<path d="${bgPath}" fill="${bgColor}" opacity="0.6" />\n`;

      // Arc segments — concentric rings within the wedge
      for (let seg = 0; seg < SEGMENTS; seg++) {
        const rIn = R_INNER + seg * RING_H + RING_GAP;
        const rOut = R_INNER + (seg + 1) * RING_H - RING_GAP;
        const lit = seg < litCount;
        const color = lit ? segColor(seg, SEGMENTS, isOver) : '#151515';
        const opacity = lit ? 1 : 0.2;

        const path = arcSectorPath(wedgeStart, wedgeEnd, rIn, rOut);
        svg += `<path d="${path}" fill="${color}" opacity="${opacity}" style="transition:opacity .3s" />\n`;
      }

      // Selected day highlight — faint overlay on full wedge
      if (isSelected) {
        const hlPath = arcSectorPath(wedgeStart - 0.5, wedgeEnd + 0.5, R_INNER - 2, R_OUTER + 2);
        svg += `<path d="${hlPath}" fill="none" stroke="#ffb000" stroke-width="1.5" opacity="0.5" />\n`;
      }

      // Day label + percentage — stacked at wedge midpoint, beyond outer radius
      const midAngle = START_ANGLE + (i + 0.5) * SPOKE_ANGLE;
      const labelR = R_OUTER + 28;
      const lp = polar(midAngle, labelR);
      const dayColor = isSelected ? '#ffb000' : '#665500';
      const fontWeight = isSelected ? 'bold' : 'normal';
      const cal = Math.round(d.calories);
      const pctText = cal > 0 ? Math.round(pct * 100) + '%' : '';
      const pctColor = isOver ? '#cc3300' : '#555';

      svg += `<text x="${lp.x.toFixed(2)}" y="${lp.y.toFixed(2)}" text-anchor="middle" fill="${dayColor}" font-family="var(--font)" font-size="13" font-weight="${fontWeight}">`;
      svg += `<tspan x="${lp.x.toFixed(2)}" dy="-0.4em">${DAY_LABELS[i]}</tspan>`;
      if (pctText) {
        svg += `<tspan x="${lp.x.toFixed(2)}" dy="1.1em" fill="${pctColor}" font-size="10" font-weight="normal">${pctText}</tspan>`;
      }
      svg += `</text>\n`;

      // Clickable hit area — invisible wedge
      const hitPath = arcSectorPath(wedgeStart - ARC_GAP, wedgeEnd + ARC_GAP, R_INNER - 8, R_OUTER + 39);
      svg += `<path d="${hitPath}" fill="transparent" data-day="${i}" role="button" tabindex="0" aria-label="${DAY_LABELS[i]}: ${Math.round(d.calories)} calories" style="cursor:pointer" />\n`;
    }

    // Center label
    svg += `<text x="${CX}" y="${CY + 1}" text-anchor="middle" dominant-baseline="central" fill="#555" font-family="var(--font)" font-size="11">weekly</text>\n`;

    this.innerHTML = `
      <div class="weekly-trend">
        <svg class="weekly-trend__svg" viewBox="0 0 ${VIEW} ${VIEW}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Weekly calorie trend">
          ${svg}
        </svg>
      </div>
    `;

    // Click + keyboard handlers for day wedges
    this.querySelectorAll('[data-day]').forEach((el) => {
      const handler = () => {
        const dayIndex = parseInt(el.dataset.day, 10);
        this.dispatchEvent(new CustomEvent('trend-day-selected', {
          bubbles: true,
          detail: { dayIndex },
        }));
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });
  }
}

customElements.define('weekly-trend', WeeklyTrend);

export default WeeklyTrend;
