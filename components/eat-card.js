import { addLogEntry } from '../utils/db.js';
import { escHtml, typewrite } from '../utils/html.js';

class EatCard extends HTMLElement {
  constructor() {
    super();
    this._recipe = null;
    this._inventory = 0;
  }

  set recipe(value) {
    this._recipe = value;
  }

  get recipe() {
    return this._recipe;
  }

  set inventory(value) {
    this._inventory = value;
    if (this.isConnected) this.render();
  }

  get inventory() {
    return this._inventory;
  }

  connectedCallback() {
    if (this._recipe) this.render();
  }

  _stockLevel(count) {
    if (count <= 0) return '';
    if (count <= 3) return 'few';
    if (count <= 10) return 'some';
    return 'many';
  }

  render() {
    const r = this._recipe;
    if (!r) {
      this.innerHTML = '';
      return;
    }

    const m = r.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 };
    const stock = this._stockLevel(this._inventory);

    this.innerHTML = `
      <div class="inventory-card" ${stock ? `data-stock="${stock}"` : ''}>
        <div class="inventory-card__header">
          <span class="inventory-card__name">${escHtml(r.name)}</span>
          <span class="inventory-card__stock">${this._inventory} servings</span>
        </div>
        <div class="inventory-card__macros">
          <span>p:${Math.round(m.protein)}g</span>
          <span>c:${Math.round(m.carbs)}g</span>
          <span>f:${Math.round(m.fat)}g</span>
          <span>cal:${Math.round(m.calories)}</span>
        </div>
        <div class="inventory-card__actions">
          ${this._inventory > 0
            ? '<button class="btn btn-primary" data-action="eat">[eat]</button>'
            : '<span class="msg-dim">depleted</span>'}
        </div>
      </div>
    `;

    const eatBtn = this.querySelector('[data-action="eat"]');
    if (eatBtn) {
      eatBtn.addEventListener('click', () => {
        this._handleEat();
      });
    }
  }

  _handleEat() {
    const actions = this.querySelector('.inventory-card__actions');
    actions.innerHTML = `
      <span class="prompt">eat 1 serving?</span>
      <button class="btn" data-action="confirm-eat">[y]</button>
      <button class="btn" data-action="cancel">[n]</button>
    `;

    const confirm = actions.querySelector('[data-action="confirm-eat"]');
    const cancel = actions.querySelector('[data-action="cancel"]');

    confirm.addEventListener('click', async () => {
      try {
        await addLogEntry({
          recipeId: this._recipe.id,
          type: 'consumption',
          servings: 1,
          date: Date.now(),
        });

        this._inventory -= 1;
        this.render();
        this.dispatchEvent(new CustomEvent('consumption-logged', {
          bubbles: true,
          detail: { recipeId: this._recipe.id, servings: 1, inventory: this._inventory },
        }));
      } catch (err) {
        console.error('[Eat] failed to log consumption', err);
        this._showError(actions, `failed to log — ${err.message}`);
      }
    });

    cancel.addEventListener('click', () => this.render());
  }

  _showError(container, message) {
    let errorEl = container.querySelector('.eat-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'msg-error eat-error';
      container.appendChild(errorEl);
    }
    typewrite(errorEl, message);
  }

}

customElements.define('eat-card', EatCard);

export default EatCard;
