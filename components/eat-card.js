import { addLogEntry } from '../utils/db.js';
import './num-input.js';

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
          <span class="inventory-card__name">${this._esc(r.name)}</span>
          <span class="inventory-card__stock">${this._inventory} servings</span>
        </div>
        <div class="inventory-card__macros">
          <span>p:${Math.round(m.protein)}g</span>
          <span>c:${Math.round(m.carbs)}g</span>
          <span>f:${Math.round(m.fat)}g</span>
          <span>cal:${Math.round(m.calories)}</span>
        </div>
        <div class="inventory-card__actions">
          <button class="btn btn-primary" data-action="eat">[eat]</button>
        </div>
      </div>
    `;

    this.querySelector('[data-action="eat"]').addEventListener('click', () => {
      this._handleEat();
    });
  }

  _handleEat() {
    const actions = this.querySelector('.inventory-card__actions');
    actions.innerHTML = `
      <span class="prompt">servings to eat:</span>
      <num-input min="1" max="${this._inventory}" value="1" width="6ch"></num-input>
      <button class="btn" data-action="confirm-eat">[ok]</button>
      <button class="btn" data-action="cancel">[cancel]</button>
    `;

    const numInput = actions.querySelector('num-input');
    numInput.focus();
    numInput.select();

    const confirm = actions.querySelector('[data-action="confirm-eat"]');
    const cancel = actions.querySelector('[data-action="cancel"]');

    let submitting = false;
    const submit = async () => {
      if (submitting) return;
      const servings = parseInt(numInput.value, 10);
      if (!servings || servings < 1) return;
      if (servings > this._inventory) {
        this._showError(actions, `only ${this._inventory} servings available`);
        return;
      }
      submitting = true;

      try {
        await addLogEntry({
          recipeId: this._recipe.id,
          type: 'consumption',
          servings: servings,
          date: Date.now(),
        });

        this._inventory -= servings;
        this.render();
        this.dispatchEvent(new CustomEvent('consumption-logged', {
          bubbles: true,
          detail: { recipeId: this._recipe.id, servings, inventory: this._inventory },
        }));
      } catch (err) {
        submitting = false;
        console.error('[Eat] failed to log consumption', err);
        this._showError(actions, `failed to log — ${err.message}`);
      }
    };

    confirm.addEventListener('click', submit);
    numInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') this.render();
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
    errorEl.textContent = message;
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define('eat-card', EatCard);

export default EatCard;
