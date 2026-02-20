// Weekly Trend — vertical segmented equalizer columns

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SEGMENTS = 12;
const SEG_H = 8;
const SEG_GAP = 2;
const COL_W = 24;
const COL_GAP = 12;
const COL_H = SEGMENTS * (SEG_H + SEG_GAP) - SEG_GAP; // total column pixel height

// Layout
const MARGIN_LEFT = 32;
const MARGIN_TOP = 18;
const LABEL_Y = MARGIN_TOP + COL_H + 16;
const CAL_Y = LABEL_Y + 14;
const VIEW_W = MARGIN_LEFT + 7 * (COL_W + COL_GAP) - COL_GAP + 10;
const VIEW_H = CAL_Y + 8;

// Target line is at 100% — maps to top of column area
const TARGET_Y = MARGIN_TOP;

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
    const label = this._weekLabel ? ` [${this._weekLabel}]` : '';

    if (!data || data.length === 0) {
      this.innerHTML = `
        <div class="weekly-trend">
          <h3 class="prompt">weekly trend${label}</h3>
          <div class="weekly-trend__empty">no data</div>
        </div>
      `;
      return;
    }

    let svg = '';

    // Target reference line — dashed horizontal at 100%
    svg += `<line x1="${MARGIN_LEFT - 4}" y1="${TARGET_Y}" x2="${MARGIN_LEFT + 7 * (COL_W + COL_GAP) - COL_GAP + 4}" y2="${TARGET_Y}" stroke="#333" stroke-width="1" stroke-dasharray="3 3" />\n`;
    svg += `<text x="${MARGIN_LEFT - 6}" y="${TARGET_Y + 4}" text-anchor="end" fill="#555" font-family="var(--font)" font-size="9">100%</text>\n`;

    // Columns
    for (let col = 0; col < data.length && col < 7; col++) {
      const d = data[col];
      const pct = d.target > 0 ? d.calories / d.target : 0;
      const cappedPct = Math.min(pct, 1.2); // cap visual at 120%
      const litCount = Math.round(cappedPct * SEGMENTS);
      const isOver = pct > 1;
      const isSelected = d.isSelected;

      const colX = MARGIN_LEFT + col * (COL_W + COL_GAP);

      // Selected day highlight — subtle background rect
      if (isSelected) {
        svg += `<rect x="${colX - 2}" y="${MARGIN_TOP - 2}" width="${COL_W + 4}" height="${COL_H + 4}" fill="none" stroke="#ffb000" stroke-width="1" opacity="0.4" />\n`;
      }

      // Segments — bottom to top
      for (let seg = 0; seg < SEGMENTS; seg++) {
        // seg 0 = bottom, seg SEGMENTS-1 = top
        const y = MARGIN_TOP + COL_H - (seg + 1) * (SEG_H + SEG_GAP) + SEG_GAP;
        const lit = seg < litCount;
        const color = lit ? segColor(seg, SEGMENTS, isOver) : '#1a1a1a';
        const opacity = lit ? 1 : 0.15;

        svg += `<rect x="${colX}" y="${y}" width="${COL_W}" height="${SEG_H}" fill="${color}" opacity="${opacity}" style="transition:opacity .3s" />\n`;
      }

      // Day label
      const dayLabel = DAY_LABELS[col] || '?';
      const dayColor = isSelected ? '#ffb000' : '#665500';
      svg += `<text x="${colX + COL_W / 2}" y="${LABEL_Y}" text-anchor="middle" fill="${dayColor}" font-family="var(--font)" font-size="10" font-weight="${isSelected ? 'bold' : 'normal'}">${dayLabel}</text>\n`;

      // Calorie value
      const cal = Math.round(d.calories);
      const calColor = isOver ? '#cc3300' : '#555';
      svg += `<text x="${colX + COL_W / 2}" y="${CAL_Y}" text-anchor="middle" fill="${calColor}" font-family="var(--font)" font-size="9">${cal > 0 ? cal : '-'}</text>\n`;

      // Percentage above column
      if (cal > 0) {
        const pctText = Math.round(pct * 100) + '%';
        const pctColor = isOver ? '#cc3300' : '#665500';
        svg += `<text x="${colX + COL_W / 2}" y="${MARGIN_TOP - 4}" text-anchor="middle" fill="${pctColor}" font-family="var(--font)" font-size="8">${pctText}</text>\n`;
      }

      // Clickable hit area covering column + labels
      svg += `<rect x="${colX - COL_GAP / 2}" y="0" width="${COL_W + COL_GAP}" height="${VIEW_H}" fill="transparent" data-day="${col}" style="cursor:pointer" />\n`;
    }

    this.innerHTML = `
      <div class="weekly-trend">
        <h3 class="prompt">weekly trend${label}</h3>
        <svg class="weekly-trend__svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg">
          ${svg}
        </svg>
      </div>
    `;

    // Click handlers for day columns
    this.querySelectorAll('[data-day]').forEach((el) => {
      el.addEventListener('click', () => {
        const dayIndex = parseInt(el.dataset.day, 10);
        this.dispatchEvent(new CustomEvent('trend-day-selected', {
          bubbles: true,
          detail: { dayIndex },
        }));
      });
    });
  }
}

customElements.define('weekly-trend', WeeklyTrend);

export default WeeklyTrend;
