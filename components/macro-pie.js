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
    const total = p + c + f;

    if (total === 0) {
      this.innerHTML = `
        <div class="macro-pie">
          <h3 class="prompt">daily macros</h3>
          <svg class="macro-pie__svg" viewBox="0 0 120 120" width="150" height="150">
            <circle cx="60" cy="60" r="50" fill="none"
              stroke="var(--border-muted)" stroke-width="10"
              stroke-dasharray="4 4" />
            <text x="60" y="64" text-anchor="middle"
              fill="var(--text-muted)" font-family="var(--font)" font-size="10">
              no data
            </text>
          </svg>
        </div>
      `;
      return;
    }

    const pPct = Math.round((p / total) * 100);
    const cPct = Math.round((c / total) * 100);
    const fPct = 100 - pPct - cPct;

    // SVG donut using stroke-dasharray on circles
    const r = 50;
    const circumference = 2 * Math.PI * r;

    const segments = [
      { label: 'p', grams: p, pct: pPct, color: '#ff8800' },
      { label: 'c', grams: c, pct: cPct, color: '#ffb000' },
      { label: 'f', grams: f, pct: fPct, color: '#664400' },
    ];

    let offset = 0;
    const circles = segments.map((seg) => {
      const dashLen = (seg.pct / 100) * circumference;
      const dashGap = circumference - dashLen;
      const circle = `<circle cx="60" cy="60" r="${r}" fill="none"
        stroke="${seg.color}" stroke-width="10"
        stroke-dasharray="${dashLen} ${dashGap}"
        stroke-dashoffset="${-offset}"
        stroke-linecap="butt" />`;
      offset += dashLen;
      return circle;
    }).join('\n');

    const legendRows = segments
      .map((s) => `<div class="macro-pie__legend-row"><span class="macro-pie__legend-swatch" style="background:${s.color}"></span>${s.label}: ${s.grams}g (${s.pct}%)</div>`)
      .join('\n');

    this.innerHTML = `
      <div class="macro-pie">
        <h3 class="prompt">daily macros</h3>
        <svg class="macro-pie__svg" viewBox="0 0 120 120" width="150" height="150"
          transform="rotate(-90)">
          ${circles}
        </svg>
        <div class="macro-pie__legend">${legendRows}</div>
      </div>
    `;
  }
}

customElements.define('macro-pie', MacroPie);

export default MacroPie;
