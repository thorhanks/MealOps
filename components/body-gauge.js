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

    // Person silhouette path — simplified standing figure
    // Head, neck, shoulders, torso, arms, hips, legs, feet
    const personPath = `
      M 50 8
      C 38 8, 30 18, 30 28
      C 30 38, 38 46, 50 46
      C 62 46, 70 38, 70 28
      C 70 18, 62 8, 50 8
      Z
      M 50 48
      L 50 52
      M 38 52
      L 62 52
      C 68 52, 74 56, 76 62
      L 84 90
      C 86 96, 82 98, 78 96
      L 64 72
      L 64 120
      L 72 170
      C 73 176, 70 180, 66 180
      L 56 180
      C 54 180, 54 176, 55 170
      L 58 130
      L 50 130
      L 42 130
      L 45 170
      C 46 176, 46 180, 44 180
      L 34 180
      C 30 180, 27 176, 28 170
      L 36 120
      L 36 72
      L 22 96
      C 18 98, 14 96, 16 90
      L 24 62
      C 26 56, 32 52, 38 52
      Z
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
