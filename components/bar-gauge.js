class BarGauge extends HTMLElement {
  static get observedAttributes() {
    return ['current', 'target', 'label'];
  }

  constructor() {
    super();
  }

  connectedCallback() {
    this._animate = true;
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
    const barWidth = 20;
    const filled = Math.min(barWidth, Math.round((current / target) * barWidth));
    const empty = barWidth - filled;

    const fillChars = '\u2588'.repeat(filled);
    const emptyChars = '\u2591'.repeat(empty);

    let colorClass = '';
    if (pct >= 101) colorClass = 'bar-gauge--over';
    else if (pct >= 90) colorClass = 'bar-gauge--warning';

    this.innerHTML = `
      <div class="bar-gauge ${colorClass}">
        <span class="bar-gauge__bar">[<span class="bar-gauge__fill${this._animate ? ' bar-gauge__fill--animate' : ''}">${fillChars}</span><span class="bar-gauge__empty">${emptyChars}</span>]</span>
        <span class="bar-gauge__text">${Math.round(current)} / ${Math.round(target)} ${label} (${pct}%)</span>
      </div>
    `;
    this._animate = false;
  }
}

customElements.define('bar-gauge', BarGauge);

export default BarGauge;
