// Body Gauge — retro VU meter style vertical bar

const SEGMENT_COUNT = 20;
const SEGMENT_GAP = 2;
const SEGMENT_HEIGHT = 8;

const TICK_W = 20;       // space for tick marks on the left
const BAR_WIDTH = 80;
const LABEL_W = 30;      // space for labels on the right
const PAD = 6;            // top/bottom padding inside frame
const FRAME_STROKE = 2;

const BAR_X = TICK_W + FRAME_STROKE;
const INNER_H = SEGMENT_COUNT * (SEGMENT_HEIGHT + SEGMENT_GAP) - SEGMENT_GAP;
const VIEW_W = TICK_W + FRAME_STROKE + BAR_WIDTH + FRAME_STROKE + LABEL_W;
const VIEW_H = PAD + INNER_H + PAD;

// Stepped color bands: dim amber -> amber -> bright amber
function segmentColor(index, total) {
  const ratio = index / (total - 1);
  if (ratio < 0.5) return '#664400';
  if (ratio < 0.8) return '#aa7700';
  return '#ffb000';
}

class BodyGauge extends HTMLElement {
  static get observedAttributes() {
    return ['current', 'target', 'label'];
  }

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  render() {
    const current = parseFloat(this.getAttribute('current')) || 0;
    const target = parseFloat(this.getAttribute('target')) || 1;
    const label = this.getAttribute('label') || 'kcal';

    const pct = Math.round((current / target) * 100);
    const fillRatio = Math.min(1, current / target);
    const litCount = Math.round(fillRatio * SEGMENT_COUNT);

    const isOver = pct >= 100;
    const colorClass = isOver ? 'body-gauge--over' : '';

    // Frame
    const frameX = TICK_W;
    const frameY = 0;
    const frameW = BAR_WIDTH + FRAME_STROKE * 2;
    const frameH = VIEW_H;

    // Build segments bottom-to-top
    const segments = [];
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const y = PAD + INNER_H - (i + 1) * (SEGMENT_HEIGHT + SEGMENT_GAP) + SEGMENT_GAP;
      const isLit = i < litCount;
      const color = segmentColor(i, SEGMENT_COUNT);

      segments.push(
        `<rect x="${BAR_X}" y="${y}" width="${BAR_WIDTH}" height="${SEGMENT_HEIGHT}" fill="${color}" opacity="${isLit ? '1' : '0.1'}" />`
      );
    }

    // Tick marks and labels on the left + right
    const ticks = [];
    const tickPositions = [
      { pct: 0,   label: '0' },
      { pct: 25,  label: '' },
      { pct: 50,  label: '50' },
      { pct: 75,  label: '' },
      { pct: 100, label: '100' },
    ];

    const textColor = '#aa7700';
    const tickColor = '#555';

    for (const tp of tickPositions) {
      const segIndex = (tp.pct / 100) * SEGMENT_COUNT;
      const y = PAD + INNER_H - segIndex * (SEGMENT_HEIGHT + SEGMENT_GAP);
      const isMajor = tp.label !== '';
      const tickLen = isMajor ? 10 : 6;

      // Left tick mark
      ticks.push(
        `<line x1="${TICK_W - tickLen}" y1="${y}" x2="${TICK_W}" y2="${y}" stroke="${tickColor}" stroke-width="1" />`
      );

      // Label on right
      if (isMajor) {
        ticks.push(
          `<text x="${BAR_X + BAR_WIDTH + FRAME_STROKE + 4}" y="${y + 3}" fill="${textColor}" font-family="monospace" font-size="9">${tp.label}</text>`
        );
      }
    }

    // Peak indicator — small marker at current level
    const peakY = PAD + INNER_H - litCount * (SEGMENT_HEIGHT + SEGMENT_GAP);
    const peakColor = litCount >= SEGMENT_COUNT ? '#a04030' : '#aa7700';

    this.innerHTML = `
      <div class="body-gauge ${colorClass}">
        <svg class="body-gauge__svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
          <!-- Frame -->
          <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" fill="none" stroke="#333" stroke-width="${FRAME_STROKE}" />
          <!-- Segments -->
          ${segments.join('\n          ')}
          <!-- Peak indicator -->
          <rect x="${BAR_X}" y="${peakY - 1}" width="${BAR_WIDTH}" height="2" fill="${peakColor}" opacity="0.8" />
          <!-- Ticks and labels -->
          ${ticks.join('\n          ')}
        </svg>
        <div class="body-gauge__text">${Math.round(current)} / ${Math.round(target)} ${label} (${pct}%)</div>
      </div>
    `;
  }
}

customElements.define('body-gauge', BodyGauge);

export default BodyGauge;
