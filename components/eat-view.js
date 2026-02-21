import { getAllInventory } from '../utils/db.js';
import './eat-card.js';

class EatView extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this._load();
    this.addEventListener('consumption-logged', (e) => {
      const { inventory } = e.detail;
      if (inventory <= 0) {
        this._load();
      }
    });
  }

  async _load() {
    let items;
    try {
      items = await getAllInventory();
    } catch (err) {
      console.error('[Eat] failed to load inventory', err);
      this.innerHTML = `<span class="msg-error">failed to load inventory — ${err.message}</span>`;
      return;
    }

    this.innerHTML = `
      <div class="eat-header">
        <h2 class="prompt">eat</h2>
      </div>
      <div class="eat-grid" id="eat-grid"></div>
    `;

    const grid = this.querySelector('#eat-grid');

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p>no servings in inventory</p>
          <p>make recipes in [cook] section to add to inventory</p>
        </div>
      `;
      return;
    }

    items.forEach(({ recipe, inventory }, i) => {
      const card = document.createElement('eat-card');
      card.recipe = recipe;
      card.inventory = inventory;
      card.style.animationDelay = `${i * 50}ms`;
      grid.appendChild(card);
    });
  }
}

customElements.define('eat-view', EatView);

export default EatView;
