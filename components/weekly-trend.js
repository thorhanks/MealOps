const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
          <h3 class="prompt">weekly trend</h3>
          <div class="weekly-trend__empty">no data</div>
        </div>
      `;
      return;
    }

    const barWidth = 16;
    const rows = data.map((d, i) => {
      const pct = d.target > 0 ? Math.round((d.calories / d.target) * 100) : 0;
      const filled = d.target > 0 ? Math.min(barWidth, Math.round((d.calories / d.target) * barWidth)) : 0;
      const empty = barWidth - filled;

      const fillChars = '#'.repeat(filled);
      const emptyChars = '-'.repeat(empty);

      const isOver = pct > 100;
      const overClass = isOver ? ' weekly-trend__row--over' : '';
      const selectedClass = d.isSelected ? ' weekly-trend__row--selected' : '';
      const day = DAY_NAMES[i] || '???';

      return `<div class="weekly-trend__row${overClass}${selectedClass}">` +
        `<span class="weekly-trend__day">${day}</span>  ` +
        `[<span class="weekly-trend__fill">${fillChars}</span><span class="weekly-trend__empty-bar">${emptyChars}</span>]` +
        `  <span class="weekly-trend__cal">${String(Math.round(d.calories)).padStart(5)}</span>` +
        `  <span class="weekly-trend__pct">(${String(pct).padStart(3)}%)</span>` +
        `</div>`;
    }).join('\n');

    const label = this._weekLabel ? ` [${this._weekLabel}]` : '';

    this.innerHTML = `
      <div class="weekly-trend">
        <h3 class="prompt">weekly trend${label}</h3>
        <pre class="weekly-trend__chart">${rows}</pre>
      </div>
    `;
  }
}

customElements.define('weekly-trend', WeeklyTrend);

export default WeeklyTrend;
