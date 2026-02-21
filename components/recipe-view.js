import { getRecipe, getInventory } from '../utils/db.js';
import { navigate } from '../utils/router.js';
import { escHtml } from '../utils/html.js';

class RecipeView extends HTMLElement {
  constructor() {
    super();
    this._recipe = null;
    this._inventory = 0;
  }

  set recipeId(id) {
    this._load(id);
  }

  async _load(id) {
    this._recipe = await getRecipe(id);
    if (!this._recipe) {
      this.innerHTML = '<span class="msg-error">recipe not found [id:' + id + ']</span>';
      return;
    }
    this._inventory = await getInventory(id);
    this.render();
  }

  render() {
    const r = this._recipe;
    if (!r) return;

    const m = r.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 };

    const ingredientsList = (r.ingredients || []).map((ing) => {
      const n = ing.nutrition || {};
      const src = ing.source === 'usda-api' ? 'usda' : 'manual';
      return `<div class="recipe-view__ingredient">
        ${escHtml(ing.amount)} ${escHtml(ing.unit)} ${escHtml(ing.name)}
        <span class="recipe-view__ing-macros">[p:${Math.round(n.protein || 0)}g c:${Math.round(n.carbs || 0)}g f:${Math.round(n.fat || 0)}g cal:${Math.round(n.calories || 0)}] (${src})</span>
      </div>`;
    }).join('');

    this.innerHTML = `
      <div class="recipe-view">
        <div class="recipe-view__header">
          <h2 class="prompt">${escHtml(r.name)}</h2>
          <span class="recipe-view__meta">${r.servings} servings | ${this._inventory} in stock</span>
        </div>

        <div class="recipe-view__macros">
          > per serving: [p:${Math.round(m.protein)}g c:${Math.round(m.carbs)}g f:${Math.round(m.fat)}g cal:${Math.round(m.calories)}]
        </div>

        <div class="recipe-view__section">
          <h3>> ingredients</h3>
          ${ingredientsList || '<span class="text-muted">no ingredients</span>'}
        </div>

        <div class="recipe-view__section">
          <h3>> instructions</h3>
          <pre class="recipe-view__instructions">${escHtml(r.instructions || 'no instructions')}</pre>
        </div>

        <div class="recipe-view__actions">
          <button class="btn" data-action="edit">[edit]</button>
          <button class="btn" data-action="back">[back]</button>
        </div>
      </div>
    `;

    this.querySelector('[data-action="edit"]').addEventListener('click', () => {
      navigate('/cook/' + r.id + '/edit');
    });

    this.querySelector('[data-action="back"]').addEventListener('click', () => {
      navigate('/cook');
    });
  }

}

customElements.define('recipe-view', RecipeView);

export default RecipeView;
