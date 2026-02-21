import { searchFoodsDebounced, scaleNutrients, getApiKey, saveApiKey } from '../utils/api.js';
import { UNIT_OPTIONS, toGrams } from '../utils/units.js';
import './num-input.js';
import { escHtml, typeMsg } from '../utils/html.js';

class AdhocFood extends HTMLElement {
  constructor() {
    super();
    this._date = null;
  }

  set date(value) {
    this._date = value;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const unitOptions = UNIT_OPTIONS.map((u) =>
      `<option value="${u.value}">${u.label}</option>`
    ).join('');

    this.innerHTML = `
      <div class="adhoc-food">
        <div class="adhoc-food__row">
          <input type="text" class="input adhoc-food__name" placeholder="food name">
          <num-input class="adhoc-food__amount" min="0" step="any" value="" width="6ch" placeholder="amt"></num-input>
          <select class="input adhoc-food__unit">${unitOptions}</select>
          <button class="btn adhoc-food__search">[search]</button>
        </div>
        <div class="adhoc-food__results"></div>
        <div class="adhoc-food__macros">
          <div class="adhoc-food__macro-fields">
            <label>p:</label><input type="number" class="input" data-macro="protein" value="0" step="any">g
            <label>c:</label><input type="number" class="input" data-macro="carbs" value="0" step="any">g
            <label>f:</label><input type="number" class="input" data-macro="fat" value="0" step="any">g
            <label>cal:</label><input type="number" class="input" data-macro="calories" value="0" step="any">
          </div>
        </div>
        <div class="adhoc-food__actions">
          <button class="btn btn-primary adhoc-food__submit">[log]</button>
          <button class="btn adhoc-food__cancel">[cancel]</button>
        </div>
        <div class="adhoc-food__status"></div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.querySelector('.adhoc-food__search').addEventListener('click', () => this._handleSearch());
    this.querySelector('.adhoc-food__submit').addEventListener('click', () => this._handleSubmit());
    this.querySelector('.adhoc-food__cancel').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('adhoc-cancelled', { bubbles: true }));
    });

    // Enter on name field triggers search
    this.querySelector('.adhoc-food__name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSearch();
    });

    // Amount/unit change → recalc if USDA data cached
    const amountInput = this.querySelector('.adhoc-food__amount');
    amountInput.addEventListener('change', () => this._recalcFromUsda());
    this.querySelector('.adhoc-food__unit').addEventListener('change', () => this._recalcFromUsda());
  }

  _recalcFromUsda() {
    if (!this._nutrientsPer100g) return;

    const amount = parseFloat(this.querySelector('.adhoc-food__amount').value) || 0;
    const unit = this.querySelector('.adhoc-food__unit').value;
    const grams = toGrams(amount, unit);

    if (grams != null) {
      const scaled = scaleNutrients(this._nutrientsPer100g, grams);
      this._setMacroFields(scaled);
    }
  }

  _setMacroFields(macros) {
    const fields = this.querySelectorAll('.adhoc-food__macro-fields input[data-macro]');
    fields.forEach((f) => {
      const key = f.dataset.macro;
      if (macros[key] != null) f.value = Math.round(macros[key] * 10) / 10;
    });
  }

  _getMacroFields() {
    const macros = { protein: 0, carbs: 0, fat: 0, calories: 0 };
    const fields = this.querySelectorAll('.adhoc-food__macro-fields input[data-macro]');
    fields.forEach((f) => {
      macros[f.dataset.macro] = parseFloat(f.value) || 0;
    });
    return macros;
  }

  async _handleSearch() {
    const name = this.querySelector('.adhoc-food__name').value.trim();
    if (!name) return;

    const apiKey = await getApiKey();
    if (!apiKey) {
      this._showApiKeyPrompt();
      return;
    }

    const resultsEl = this.querySelector('.adhoc-food__results');
    typeMsg(resultsEl, 'searching USDA...', 'loading');

    try {
      const results = await searchFoodsDebounced(name, 10);
      if (results.length === 0) {
        typeMsg(resultsEl, 'no results — enter macros manually', 'error');
        return;
      }

      resultsEl.innerHTML = '';
      const list = document.createElement('div');
      list.className = 'usda-results';

      results.forEach((food) => {
        const item = document.createElement('button');
        item.className = 'btn usda-results__item';
        const n = food.nutrients;
        item.innerHTML = `${escHtml(food.description)} <span class="usda-results__macros">[p:${Math.round(n.protein)}g c:${Math.round(n.carbs)}g f:${Math.round(n.fat)}g cal:${Math.round(n.calories)}/100g]</span>`;
        item.addEventListener('click', () => this._selectResult(food));
        list.appendChild(item);
      });

      resultsEl.appendChild(list);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[AdhocFood] search error', err);
      typeMsg(resultsEl, err.message, 'error');
    }
  }

  _selectResult(food) {
    this._nutrientsPer100g = food.nutrients;

    const amount = parseFloat(this.querySelector('.adhoc-food__amount').value) || 0;
    const unit = this.querySelector('.adhoc-food__unit').value;
    const grams = toGrams(amount, unit);

    let macros;
    if (grams != null && amount > 0) {
      macros = scaleNutrients(food.nutrients, grams);
    } else {
      macros = { ...food.nutrients };
    }

    this._setMacroFields(macros);
    this.querySelector('.adhoc-food__results').innerHTML = '';
  }

  _showApiKeyPrompt() {
    const resultsEl = this.querySelector('.adhoc-food__results');
    resultsEl.innerHTML = `
      <div class="api-key-prompt">
        <span class="prompt">USDA API key required:</span>
        <input type="text" class="input api-key-prompt__input" placeholder="paste your API key">
        <button class="btn api-key-prompt__save">[save]</button>
        <button class="btn api-key-prompt__cancel">[cancel]</button>
        <div><span class="api-key-prompt__hint">get a free key at fdc.nal.usda.gov/api-key-signup.html</span></div>
      </div>
    `;

    const input = resultsEl.querySelector('.api-key-prompt__input');
    input.focus();

    const submitKey = async () => {
      const key = input.value.trim();
      if (key) {
        await saveApiKey(key);
        typeMsg(resultsEl, 'API key saved', 'ok');
        setTimeout(() => this._handleSearch(), 500);
      }
    };

    resultsEl.querySelector('.api-key-prompt__save').addEventListener('click', submitKey);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitKey(); });
    resultsEl.querySelector('.api-key-prompt__cancel').addEventListener('click', () => {
      resultsEl.innerHTML = '';
    });
  }

  _handleSubmit() {
    const name = this.querySelector('.adhoc-food__name').value.trim();
    const statusEl = this.querySelector('.adhoc-food__status');

    if (!name) {
      typeMsg(statusEl, 'food name is required', 'error');
      return;
    }

    const amount = parseFloat(this.querySelector('.adhoc-food__amount').value) || 0;
    const unit = this.querySelector('.adhoc-food__unit').value;
    const macros = this._getMacroFields();

    this.dispatchEvent(new CustomEvent('adhoc-logged', {
      bubbles: true,
      detail: {
        type: 'consumption',
        recipeId: null,
        foodName: name,
        amount,
        unit,
        macros,
        date: this._date || Date.now(),
      },
    }));

    // Reset form
    this._nutrientsPer100g = null;
    this.querySelector('.adhoc-food__name').value = '';
    this.querySelector('.adhoc-food__amount').value = '';
    this._setMacroFields({ protein: 0, carbs: 0, fat: 0, calories: 0 });
    this.querySelector('.adhoc-food__results').innerHTML = '';
    statusEl.innerHTML = '';
  }

}

customElements.define('adhoc-food', AdhocFood);

export default AdhocFood;
