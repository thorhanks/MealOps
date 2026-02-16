import { saveRecipe, getRecipe } from '../utils/db.js';
import { searchFoodsDebounced, scaleNutrients, getApiKey, saveApiKey } from '../utils/api.js';
import { UNIT_OPTIONS, toGrams, hasFixedConversion } from '../utils/units.js';
import { navigate } from '../utils/router.js';
import './num-input.js';

class RecipeForm extends HTMLElement {
  constructor() {
    super();
    this._recipe = null;
    this._ingredients = [];
    this._mode = 'create'; // 'create' or 'edit'
  }

  set recipeId(id) {
    if (id) {
      this._mode = 'edit';
      getRecipe(id).then((recipe) => {
        if (recipe) {
          this._recipe = recipe;
          this._ingredients = recipe.ingredients.map((ing) => ({ ...ing }));
        }
        this.render();
      });
    } else {
      this._mode = 'create';
      this._recipe = null;
      this._ingredients = [];
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const r = this._recipe;
    const isEdit = this._mode === 'edit';

    this.innerHTML = `
      <div class="recipe-form">
        <h2 class="prompt">${isEdit ? 'edit recipe' : 'new recipe'}</h2>

        <div class="recipe-form__field">
          <label>> name:</label>
          <input type="text" class="input" id="rf-name"
            value="${this._esc(r?.name || '')}"
            placeholder="recipe name">
        </div>

        <div class="recipe-form__field">
          <label>> servings:</label>
          <num-input id="rf-servings" min="1" value="${r?.servings || 1}" width="6ch"></num-input>
        </div>

        <div class="recipe-form__section">
          <h3>> ingredients</h3>
          <div id="rf-ingredients"></div>
          <button class="btn" id="rf-add-ingredient">[+ add ingredient]</button>
        </div>

        <div class="recipe-form__field">
          <label>> instructions:</label>
          <textarea class="input recipe-form__textarea" id="rf-instructions"
            placeholder="preparation steps">${this._esc(r?.instructions || '')}</textarea>
        </div>

        <div class="recipe-form__macros" id="rf-macros-summary"></div>

        <div class="recipe-form__actions">
          <button class="btn btn-primary" id="rf-save">[${isEdit ? 'save' : 'create'}]</button>
          <button class="btn" id="rf-cancel">[cancel]</button>
        </div>

        <div id="rf-status"></div>
      </div>
    `;

    // Render existing ingredients
    const container = this.querySelector('#rf-ingredients');
    this._ingredients.forEach((ing, i) => {
      container.appendChild(this._createIngredientRow(i, ing));
    });

    this._updateMacrosSummary();

    // Event listeners
    this.querySelector('#rf-add-ingredient').addEventListener('click', () => {
      this._ingredients.push({
        name: '', amount: 0, unit: 'g', gramsEquivalent: 0,
        nutrition: { protein: 0, carbs: 0, fat: 0, calories: 0 },
        source: 'manual', usdaId: null,
      });
      const row = this._createIngredientRow(this._ingredients.length - 1, this._ingredients[this._ingredients.length - 1]);
      this.querySelector('#rf-ingredients').appendChild(row);
    });

    this.querySelector('#rf-servings').addEventListener('change', () => this._updateMacrosSummary());

    this.querySelector('#rf-save').addEventListener('click', () => this._handleSave());
    this.querySelector('#rf-cancel').addEventListener('click', () => navigate('/cook'));
  }

  _createIngredientRow(index, ing) {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.dataset.index = index;

    const unitOptions = UNIT_OPTIONS.map((u) =>
      `<option value="${u.value}" ${ing.unit === u.value ? 'selected' : ''}>${u.label}</option>`
    ).join('');

    row.innerHTML = `
      <div class="ingredient-row__main">
        <input type="text" class="input ingredient-row__name" placeholder="ingredient name"
          value="${this._esc(ing.name || '')}">
        <num-input class="ingredient-row__amount" min="0" step="any"
          value="${ing.amount || ''}" width="6ch"></num-input>
        <select class="input ingredient-row__unit">${unitOptions}</select>
        <button class="btn ingredient-row__search" title="Search USDA">[search]</button>
        <button class="btn ingredient-row__manual" title="Manual entry">[manual]</button>
        <button class="btn btn-danger ingredient-row__remove">[x]</button>
      </div>
      <div class="ingredient-row__results"></div>
      <div class="ingredient-row__nutrition">
        ${ing.source === 'manual' ? this._manualNutritionFields(index, ing) : this._nutritionDisplay(ing)}
      </div>
    `;

    // Name change → sync to data
    row.querySelector('.ingredient-row__name').addEventListener('input', (e) => {
      this._ingredients[index].name = e.target.value;
    });

    // Amount change → recalc nutrition if we have USDA data
    const amountInput = row.querySelector('.ingredient-row__amount');
    amountInput.addEventListener('change', () => {
      this._ingredients[index].amount = parseFloat(amountInput.value) || 0;
      this._recalcIngredientNutrition(index);
    });
    // Also listen on the inner input for direct typing
    const amountField = amountInput.querySelector('input');
    if (amountField) {
      amountField.addEventListener('input', () => {
        this._ingredients[index].amount = parseFloat(amountField.value) || 0;
        this._recalcIngredientNutrition(index);
      });
    }

    // Unit change → recalc
    row.querySelector('.ingredient-row__unit').addEventListener('change', (e) => {
      this._ingredients[index].unit = e.target.value;
      this._recalcIngredientNutrition(index);
    });

    // USDA search
    row.querySelector('.ingredient-row__search').addEventListener('click', () => {
      this._handleSearch(index, row);
    });

    // Manual entry toggle
    row.querySelector('.ingredient-row__manual').addEventListener('click', () => {
      this._ingredients[index].source = 'manual';
      const nutritionEl = row.querySelector('.ingredient-row__nutrition');
      nutritionEl.innerHTML = this._manualNutritionFields(index, this._ingredients[index]);
      this._bindManualFields(index, row);
    });

    // Remove
    row.querySelector('.ingredient-row__remove').addEventListener('click', () => {
      this._ingredients.splice(index, 1);
      this._rebuildIngredientRows();
    });

    // Bind manual fields if in manual mode
    if (ing.source === 'manual') {
      // Defer to next tick so DOM is attached
      setTimeout(() => this._bindManualFields(index, row), 0);
    }

    return row;
  }

  _nutritionDisplay(ing) {
    const n = ing.nutrition || { protein: 0, carbs: 0, fat: 0, calories: 0 };
    const source = ing.source === 'usda-api' ? 'usda' : 'manual';
    return `<span class="ingredient-row__macro-display">
      [p:${Math.round(n.protein * 10) / 10}g c:${Math.round(n.carbs * 10) / 10}g f:${Math.round(n.fat * 10) / 10}g cal:${Math.round(n.calories)}] (${source})
    </span>`;
  }

  _manualNutritionFields(index, ing) {
    const n = ing.nutrition || { protein: 0, carbs: 0, fat: 0, calories: 0 };
    return `
      <div class="ingredient-row__manual-fields">
        <label>p:</label><input type="number" class="input" data-macro="protein" value="${n.protein}" step="any" style="width: 6ch;">g
        <label>c:</label><input type="number" class="input" data-macro="carbs" value="${n.carbs}" step="any" style="width: 6ch;">g
        <label>f:</label><input type="number" class="input" data-macro="fat" value="${n.fat}" step="any" style="width: 6ch;">g
        <label>cal:</label><input type="number" class="input" data-macro="calories" value="${n.calories}" step="any" style="width: 6ch;">
        <span>(manual)</span>
      </div>
    `;
  }

  _bindManualFields(index, row) {
    const fields = row.querySelectorAll('.ingredient-row__manual-fields input[data-macro]');
    fields.forEach((field) => {
      field.addEventListener('input', () => {
        const macro = field.dataset.macro;
        this._ingredients[index].nutrition[macro] = parseFloat(field.value) || 0;
        this._updateMacrosSummary();
      });
    });
  }

  _recalcIngredientNutrition(index) {
    const ing = this._ingredients[index];
    // Only recalc for USDA-sourced ingredients with cached per-100g data
    if (ing.source !== 'usda-api' || !ing._nutrientsPer100g) return;

    const grams = toGrams(ing.amount, ing.unit);
    if (grams != null) {
      ing.gramsEquivalent = grams;
      ing.nutrition = scaleNutrients(ing._nutrientsPer100g, grams);
    }

    // Update display
    const row = this.querySelector(`.ingredient-row[data-index="${index}"]`);
    if (row) {
      row.querySelector('.ingredient-row__nutrition').innerHTML = this._nutritionDisplay(ing);
    }
    this._updateMacrosSummary();
  }

  async _handleSearch(index, row) {
    const ing = this._ingredients[index];
    const query = ing.name.trim();
    if (!query) return;

    // Check for API key
    const apiKey = await getApiKey();
    if (!apiKey) {
      this._showApiKeyPrompt(index, row);
      return;
    }

    const resultsEl = row.querySelector('.ingredient-row__results');
    resultsEl.innerHTML = '<span class="msg-loading">searching USDA...</span>';

    try {
      const results = await searchFoodsDebounced(query, 5);
      if (results.length === 0) {
        resultsEl.innerHTML = '<span class="msg-error">no results found</span>';
        return;
      }
      resultsEl.innerHTML = '';
      const list = document.createElement('div');
      list.className = 'usda-results';

      results.forEach((food) => {
        const item = document.createElement('button');
        item.className = 'btn usda-results__item';
        const n = food.nutrients;
        item.innerHTML = `${this._esc(food.description)} <span class="usda-results__macros">[p:${Math.round(n.protein)}g c:${Math.round(n.carbs)}g f:${Math.round(n.fat)}g cal:${Math.round(n.calories)}/100g]</span>`;
        item.addEventListener('click', () => {
          this._selectUsdaResult(index, row, food);
        });
        list.appendChild(item);
      });

      resultsEl.appendChild(list);
    } catch (err) {
      console.error('[API]', err);
      if (err.message === 'Invalid USDA API key') {
        resultsEl.innerHTML = '<span class="msg-error">invalid API key — check settings</span>';
      } else {
        resultsEl.innerHTML = `<span class="msg-error">${this._esc(err.message)}</span>`;
      }
    }
  }

  _selectUsdaResult(index, row, food) {
    const ing = this._ingredients[index];
    ing.source = 'usda-api';
    ing.usdaId = food.fdcId;
    ing._nutrientsPer100g = food.nutrients;

    // Calculate nutrition for current amount/unit
    const grams = toGrams(ing.amount, ing.unit);
    if (grams != null) {
      ing.gramsEquivalent = grams;
      ing.nutrition = scaleNutrients(food.nutrients, grams);
    } else {
      // Variable unit — use per-100g as default, user can adjust
      ing.gramsEquivalent = 100;
      ing.nutrition = { ...food.nutrients };
    }

    // Clear search results, show nutrition
    row.querySelector('.ingredient-row__results').innerHTML = '';
    row.querySelector('.ingredient-row__nutrition').innerHTML = this._nutritionDisplay(ing);
    this._updateMacrosSummary();
  }

  _showApiKeyPrompt(index, row) {
    const resultsEl = row.querySelector('.ingredient-row__results');
    resultsEl.innerHTML = `
      <div class="api-key-prompt">
        <span class="prompt">USDA API key required:</span>
        <input type="text" class="input" id="api-key-input" placeholder="paste your API key">
        <button class="btn" id="api-key-save">[save]</button>
        <button class="btn" id="api-key-cancel">[cancel]</button>
        <div><span class="api-key-prompt__hint">get a free key at fdc.nal.usda.gov/api-key-signup.html</span></div>
      </div>
    `;

    const input = resultsEl.querySelector('#api-key-input');
    input.focus();

    resultsEl.querySelector('#api-key-save').addEventListener('click', async () => {
      const key = input.value.trim();
      if (key) {
        await saveApiKey(key);
        resultsEl.innerHTML = '<span class="msg-ok">API key saved</span>';
        setTimeout(() => this._handleSearch(index, row), 500);
      }
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const key = input.value.trim();
        if (key) {
          await saveApiKey(key);
          resultsEl.innerHTML = '<span class="msg-ok">API key saved</span>';
          setTimeout(() => this._handleSearch(index, row), 500);
        }
      }
    });

    resultsEl.querySelector('#api-key-cancel').addEventListener('click', () => {
      resultsEl.innerHTML = '';
    });
  }

  _rebuildIngredientRows() {
    const container = this.querySelector('#rf-ingredients');
    container.innerHTML = '';
    this._ingredients.forEach((ing, i) => {
      container.appendChild(this._createIngredientRow(i, ing));
    });
    this._updateMacrosSummary();
  }

  _updateMacrosSummary() {
    const summary = this.querySelector('#rf-macros-summary');
    if (!summary) return;

    const servings = parseInt(this.querySelector('#rf-servings')?.value, 10) || 1;
    const totals = { protein: 0, carbs: 0, fat: 0, calories: 0 };

    for (const ing of this._ingredients) {
      const n = ing.nutrition || {};
      totals.protein += n.protein || 0;
      totals.carbs += n.carbs || 0;
      totals.fat += n.fat || 0;
      totals.calories += n.calories || 0;
    }

    const perServing = {
      protein: Math.round(totals.protein / servings * 10) / 10,
      carbs: Math.round(totals.carbs / servings * 10) / 10,
      fat: Math.round(totals.fat / servings * 10) / 10,
      calories: Math.round(totals.calories / servings * 10) / 10,
    };

    summary.innerHTML = `
      <div class="recipe-form__macro-total">
        > total: [p:${Math.round(totals.protein)}g c:${Math.round(totals.carbs)}g f:${Math.round(totals.fat)}g cal:${Math.round(totals.calories)}]
      </div>
      <div class="recipe-form__macro-serving">
        > per serving (${servings}): [p:${perServing.protein}g c:${perServing.carbs}g f:${perServing.fat}g cal:${perServing.calories}]
      </div>
    `;
  }

  async _handleSave() {
    const name = this.querySelector('#rf-name').value.trim();
    const servings = parseInt(this.querySelector('#rf-servings').value, 10);
    const instructions = this.querySelector('#rf-instructions').value.trim();
    const statusEl = this.querySelector('#rf-status');

    // Validation
    if (!name) {
      statusEl.innerHTML = '<span class="msg-error">recipe name is required</span>';
      return;
    }
    if (!servings || servings < 1) {
      statusEl.innerHTML = '<span class="msg-error">servings must be at least 1</span>';
      return;
    }

    // Calculate macros
    const totals = { protein: 0, carbs: 0, fat: 0, calories: 0 };
    for (const ing of this._ingredients) {
      const n = ing.nutrition || {};
      totals.protein += n.protein || 0;
      totals.carbs += n.carbs || 0;
      totals.fat += n.fat || 0;
      totals.calories += n.calories || 0;
    }

    const macros = {
      protein: Math.round(totals.protein / servings * 10) / 10,
      carbs: Math.round(totals.carbs / servings * 10) / 10,
      fat: Math.round(totals.fat / servings * 10) / 10,
      calories: Math.round(totals.calories / servings * 10) / 10,
    };

    // Clean ingredients for storage (remove transient _nutrientsPer100g)
    const cleanIngredients = this._ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      gramsEquivalent: ing.gramsEquivalent || 0,
      nutrition: { ...ing.nutrition },
      source: ing.source,
      usdaId: ing.usdaId || null,
    }));

    const recipe = {
      ...(this._recipe || {}),
      name,
      servings,
      instructions,
      ingredients: cleanIngredients,
      macros,
    };

    try {
      await saveRecipe(recipe);
      const action = this._mode === 'edit' ? 'updated' : 'created';
      console.log(`[RecipeForm] recipe ${action} [id:${recipe.id}]`);
      navigate('/cook');
    } catch (err) {
      console.error('[RecipeForm] save failed', err);
      statusEl.innerHTML = `<span class="msg-error">failed to save — ${this._esc(err.message)}</span>`;
    }
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

customElements.define('recipe-form', RecipeForm);

export default RecipeForm;
