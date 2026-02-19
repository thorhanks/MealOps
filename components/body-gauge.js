// Body Gauge — Fallout-style person silhouette calorie fill meter

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

    // SVG viewBox is 0 0 100 200 — clip-rect rises from bottom
    const clipY = 200 - (fillRatio * 200);

    let colorClass = '';
    if (pct >= 100) colorClass = 'body-gauge--over';
    else if (pct >= 90) colorClass = 'body-gauge--warning';

    // Person silhouette — military/tactical standing figure
    // Straight posture, arms at sides, straight legs, boots
    const personPath = `
      M 43 10 L 43 6 C 43 2, 57 2, 57 6 L 57 10
      C 57 14, 60 18, 60 20 L 60 24 C 60 28, 57 30, 57 30
      L 43 30 C 43 30, 40 28, 40 24 L 40 20 C 40 18, 43 14, 43 10 Z
      M 43 32 L 57 32
      L 62 34 L 68 34 L 72 36
      L 76 48 L 78 62 L 78 78
      L 74 78 L 72 62 L 68 46 L 64 40
      L 62 40 L 62 110
      L 64 112 L 64 170 L 64 176
      L 68 178 L 68 182 L 54 182 L 54 178 L 56 176
      L 56 170 L 56 112 L 54 110
      L 46 110 L 44 112
      L 44 170 L 44 176 L 46 178 L 46 182
      L 32 182 L 32 178 L 36 176 L 36 170
      L 36 112 L 38 110
      L 38 40 L 36 40
      L 32 46 L 28 62 L 26 78
      L 22 78 L 22 62 L 24 48 L 28 36
      L 32 34 L 38 34 L 43 32 Z
    `;

    this.innerHTML = `
      <div class="body-gauge ${colorClass}">
        <svg class="body-gauge__svg" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
          <defs>
            <clipPath id="body-fill-${this._clipId()}">
              <rect x="0" y="${clipY}" width="100" height="${200 - clipY}" />
            </clipPath>
          </defs>
          <!-- Outline (always visible) -->
          <path class="body-gauge__outline" d="${personPath}" />
          <!-- Filled portion (clipped) -->
          <path class="body-gauge__fill" d="${personPath}" clip-path="url(#body-fill-${this._clipId()})" />
        </svg>
        <div class="body-gauge__text">${Math.round(current)} / ${Math.round(target)} ${label} (${pct}%)</div>
      </div>
    `;
  }

  _clipId() {
    // Stable ID per instance
    if (!this.__clipId) {
      this.__clipId = Math.random().toString(36).slice(2, 8);
    }
    return this.__clipId;
  }
}

customElements.define('body-gauge', BodyGauge);

export default BodyGauge;
