import { getInventory, addLogEntry, deleteRecipe } from '../utils/db.js';
import { navigate } from '../utils/router.js';

class RecipeCard extends HTMLElement {
  constructor() {
    super();
    this._recipe = null;
    this._inventory = 0;
  }

  set recipe(value) {
    this._recipe = value;
    this._loadInventory();
  }

  get recipe() {
    return this._recipe;
  }

  async _loadInventory() {
    if (this._recipe) {
      this._inventory = await getInventory(this._recipe.id);
    }
    this.render();
  }

  connectedCallback() {
    if (this._recipe) this._loadInventory();
  }

  render() {
    const r = this._recipe;
    if (!r) {
      this.innerHTML = '';
      return;
    }

    const m = r.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 };

    this.innerHTML = `
      <div class="recipe-card">
        <div class="recipe-card__header">
          <span class="recipe-card__name">${this._esc(r.name)}</span>
          <span class="recipe-card__inventory">${this._inventory} in stock</span>
        </div>
        <div class="recipe-card__macros">
          <span>p:${Math.round(m.protein)}g</span>
          <span>c:${Math.round(m.carbs)}g</span>
          <span>f:${Math.round(m.fat)}g</span>
          <span>cal:${Math.round(m.calories)}</span>
        </div>
        <div class="recipe-card__actions">
          <button class="btn" data-action="view">[view]</button>
          <button class="btn" data-action="edit">[edit]</button>
          <button class="btn" data-action="made">[+ made]</button>
          <button class="btn btn-danger" data-action="delete">[x]</button>
        </div>
      </div>
    `;

    this.querySelector('[data-action="view"]').addEventListener('click', () => {
      navigate('/cook/' + r.id);
    });

    this.querySelector('[data-action="edit"]').addEventListener('click', () => {
      navigate('/cook/' + r.id + '/edit');
    });

    this.querySelector('[data-action="made"]').addEventListener('click', () => {
      this._handleMade();
    });

    this.querySelector('[data-action="delete"]').addEventListener('click', () => {
      this._handleDelete();
    });
  }

  async _handleMade() {
    const card = this.querySelector('.recipe-card');
    // Replace actions area with inline prompt
    const actions = this.querySelector('.recipe-card__actions');
    actions.innerHTML = `
      <span class="prompt">servings made:</span>
      <input type="number" class="input" min="1" value="1" style="width: 6ch;">
      <button class="btn" data-action="confirm-made">[ok]</button>
      <button class="btn" data-action="cancel">[cancel]</button>
    `;

    const input = actions.querySelector('input');
    input.focus();
    input.select();

    const confirm = actions.querySelector('[data-action="confirm-made"]');
    const cancel = actions.querySelector('[data-action="cancel"]');

    const submit = async () => {
      const servings = parseInt(input.value, 10);
      if (!servings || servings < 1) return;

      await addLogEntry({
        recipeId: this._recipe.id,
        type: 'production',
        servings: servings,
        date: Date.now(),
      });

      this._inventory += servings;
      this.render();
      this.dispatchEvent(new CustomEvent('inventory-changed', { bubbles: true }));
    };

    confirm.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') this.render();
    });
    cancel.addEventListener('click', () => this.render());
  }

  async _handleDelete() {
    const actions = this.querySelector('.recipe-card__actions');
    actions.innerHTML = `
      <span class="prompt">delete recipe? </span>
      <button class="btn btn-danger" data-action="confirm-delete">[y]</button>
      <button class="btn" data-action="cancel">[n]</button>
    `;

    this.querySelector('[data-action="confirm-delete"]').addEventListener('click', async () => {
      await deleteRecipe(this._recipe.id);
      this.dispatchEvent(new CustomEvent('recipe-deleted', { bubbles: true, detail: { id: this._recipe.id } }));
      this.remove();
    });

    this.querySelector('[data-action="cancel"]').addEventListener('click', () => this.render());
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define('recipe-card', RecipeCard);

export default RecipeCard;
