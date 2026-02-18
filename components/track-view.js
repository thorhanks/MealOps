import { getConsumptionByDate, getRecipe, getSettings, saveSettings, addLogEntry, removeLogEntry } from '../utils/db.js';
import './bar-gauge.js';
import './weekly-trend.js';
import './adhoc-food.js';
import './num-input.js';

// ── Date Helpers ──

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function formatDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekSunday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - dayOfWeek);
  return d.getTime();
}

function addDays(ts, days) {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

// ── Component ──

class TrackView extends HTMLElement {
  constructor() {
    super();
    this._selectedDate = startOfDay(Date.now());
    this._targetCalories = 2000;
    this._entries = [];
    this._resolvedEntries = []; // entries with macros resolved
  }

  connectedCallback() {
    this._init();
  }

  async _init() {
    const settings = await getSettings();
    this._targetCalories = settings.targetCalories || 2000;
    this._renderShell();
    await this._loadDay();
  }

  _renderShell() {
    this.innerHTML = `
      <div class="track-view">
        <div class="track-header">
          <h2 class="prompt">track</h2>
          <div class="track-header__target">
            <span>target:</span>
            <num-input class="track-target-input" min="0" step="50" value="${this._targetCalories}" width="8ch"></num-input>
            <span>kcal/day</span>
          </div>
        </div>

        <div class="track-date-nav">
          <button class="btn track-date-nav__prev">[&lt;]</button>
          <span class="track-date-nav__label prompt">showing: ${formatDate(this._selectedDate)}</span>
          <button class="btn track-date-nav__next">[&gt;]</button>
          <button class="btn track-date-nav__today">[today]</button>
        </div>

        <div class="track-columns">
          <div class="track-col-left">
            <div class="track-gauge"></div>
            <div class="track-macro-summary"></div>
            <div class="track-trend"></div>
          </div>
          <div class="track-col-right">
            <div class="track-adhoc"></div>
            <div class="track-log"></div>
          </div>
        </div>
      </div>
    `;

    // Target change
    this.querySelector('.track-target-input').addEventListener('change', () => {
      this._handleTargetChange();
    });

    // Date nav
    this.querySelector('.track-date-nav__prev').addEventListener('click', () => {
      this._selectedDate = addDays(this._selectedDate, -1);
      this._updateDateLabel();
      this._loadDay().catch((err) => console.error('[Track] load failed', err));
    });
    this.querySelector('.track-date-nav__next').addEventListener('click', () => {
      this._selectedDate = addDays(this._selectedDate, 1);
      this._updateDateLabel();
      this._loadDay().catch((err) => console.error('[Track] load failed', err));
    });
    this.querySelector('.track-date-nav__today').addEventListener('click', () => {
      this._selectedDate = startOfDay(Date.now());
      this._updateDateLabel();
      this._loadDay().catch((err) => console.error('[Track] load failed', err));
    });

    // Ad-hoc food form
    const adhoc = document.createElement('adhoc-food');
    adhoc.date = this._selectedDate;
    this.querySelector('.track-adhoc').appendChild(adhoc);

    this.addEventListener('adhoc-logged', (e) => {
      this._handleAdhocLogged(e.detail);
    });
  }

  _updateDateLabel() {
    const label = this.querySelector('.track-date-nav__label');
    if (label) label.textContent = `showing: ${formatDate(this._selectedDate)}`;

    // Update adhoc-food date
    const adhoc = this.querySelector('adhoc-food');
    if (adhoc) adhoc.date = this._selectedDate;
  }

  async _handleTargetChange() {
    const input = this.querySelector('.track-target-input');
    const value = parseInt(input.value, 10);
    if (!value || value < 0) return;

    this._targetCalories = value;
    const settings = await getSettings();
    settings.targetCalories = value;
    await saveSettings(settings);
    console.log('[Track] target updated:', value);

    this._renderGauge();
    this._renderTrend().catch((err) => console.error('[Track] trend render failed', err));
  }

  async _handleAdhocLogged(detail) {
    try {
      // Use real timestamp for today, midday for past/future dates
      const today = startOfDay(Date.now());
      if (this._selectedDate === today) {
        detail.date = Date.now();
      } else {
        detail.date = this._selectedDate + 12 * 60 * 60 * 1000; // noon of selected day
      }
      await addLogEntry(detail);
      console.log('[Track] ad-hoc food logged:', detail.foodName);
      await this._loadDay();
    } catch (err) {
      console.error('[Track] failed to log ad-hoc food', err);
    }
  }

  async _loadDay() {
    const dayStart = startOfDay(this._selectedDate);
    const dayEnd = endOfDay(this._selectedDate);

    try {
      this._entries = await getConsumptionByDate(dayStart, dayEnd);
    } catch (err) {
      console.error('[Track] failed to load consumption', err);
      this._entries = [];
    }

    // Resolve macros for each entry
    this._resolvedEntries = await this._resolveEntries(this._entries);

    this._renderGauge();
    this._renderMacroSummary();
    this._renderLog();
    await this._renderTrend();
  }

  async _resolveEntries(entries) {
    const recipeCache = {};
    const resolved = [];

    for (const entry of entries) {
      let macros;
      let displayName;
      let displayDetail;

      if (entry.recipeId) {
        // Recipe-based: look up recipe for current macros
        if (!recipeCache[entry.recipeId]) {
          recipeCache[entry.recipeId] = await getRecipe(entry.recipeId);
        }
        const recipe = recipeCache[entry.recipeId];
        if (recipe) {
          const rm = recipe.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 };
          macros = {
            protein: rm.protein * entry.servings,
            carbs: rm.carbs * entry.servings,
            fat: rm.fat * entry.servings,
            calories: rm.calories * entry.servings,
          };
          displayName = recipe.name;
          displayDetail = `${entry.servings} serving${entry.servings !== 1 ? 's' : ''}`;
        } else {
          macros = { protein: 0, carbs: 0, fat: 0, calories: 0 };
          displayName = `[deleted recipe]`;
          displayDetail = `${entry.servings} serving${entry.servings !== 1 ? 's' : ''}`;
        }
      } else {
        // Ad-hoc: macros stored inline
        macros = entry.macros || { protein: 0, carbs: 0, fat: 0, calories: 0 };
        displayName = entry.foodName || 'unknown';
        displayDetail = `${entry.amount || ''} ${entry.unit || ''}`.trim();
      }

      resolved.push({
        id: entry.id,
        recipeId: entry.recipeId,
        date: entry.date,
        macros,
        displayName,
        displayDetail,
      });
    }

    return resolved;
  }

  _sumMacros() {
    const totals = { protein: 0, carbs: 0, fat: 0, calories: 0 };
    for (const e of this._resolvedEntries) {
      totals.protein += e.macros.protein;
      totals.carbs += e.macros.carbs;
      totals.fat += e.macros.fat;
      totals.calories += e.macros.calories;
    }
    return totals;
  }

  _renderGauge() {
    const container = this.querySelector('.track-gauge');
    if (!container) return;

    const totals = this._sumMacros();
    container.innerHTML = '';
    const gauge = document.createElement('bar-gauge');
    gauge.setAttribute('current', totals.calories);
    gauge.setAttribute('target', this._targetCalories);
    gauge.setAttribute('label', 'kcal');
    container.appendChild(gauge);
  }

  _renderMacroSummary() {
    const container = this.querySelector('.track-macro-summary');
    if (!container) return;

    const t = this._sumMacros();
    container.innerHTML = `
      <div class="track-macros">
        protein: ${Math.round(t.protein)}g | carbs: ${Math.round(t.carbs)}g | fat: ${Math.round(t.fat)}g
      </div>
    `;
  }

  _renderLog() {
    const container = this.querySelector('.track-log');
    if (!container) return;

    if (this._resolvedEntries.length === 0) {
      container.innerHTML = `
        <div class="consumption-log">
          <h3 class="prompt">consumption log [${formatDate(this._selectedDate)}]</h3>
          <div class="consumption-log__empty">no entries for this day</div>
        </div>
      `;
      return;
    }

    const rows = this._resolvedEntries.map((e) => {
      const time = new Date(e.date);
      const hh = String(time.getHours()).padStart(2, '0');
      const mm = String(time.getMinutes()).padStart(2, '0');
      const m = e.macros;

      return `
        <div class="consumption-log__entry" data-id="${e.id}">
          <span class="consumption-log__time">${hh}:${mm}</span>
          <span class="consumption-log__name">${this._esc(e.displayName)}</span>
          <span class="consumption-log__detail">${this._esc(e.displayDetail)}</span>
          <span class="consumption-log__macros">[p:${Math.round(m.protein)}g c:${Math.round(m.carbs)}g f:${Math.round(m.fat)}g cal:${Math.round(m.calories)}]</span>
          <button class="btn btn-danger consumption-log__delete">[x]</button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="consumption-log">
        <h3 class="prompt">consumption log [${formatDate(this._selectedDate)}]</h3>
        ${rows}
      </div>
    `;

    // Delete handlers
    container.querySelectorAll('.consumption-log__delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const entry = e.target.closest('.consumption-log__entry');
        this._handleDeleteEntry(entry.dataset.id, entry);
      });
    });
  }

  _handleDeleteEntry(entryId, entryEl) {
    // Inline confirmation
    const btn = entryEl.querySelector('.consumption-log__delete');
    if (btn.dataset.confirming) {
      // Already confirming — execute delete
      this._executeDelete(entryId);
      return;
    }

    btn.dataset.confirming = 'true';
    btn.textContent = '[y]';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = '[n]';
    btn.after(cancelBtn);

    const prompt = document.createElement('span');
    prompt.className = 'consumption-log__confirm-prompt';
    prompt.textContent = 'delete?';
    btn.before(prompt);

    cancelBtn.addEventListener('click', () => {
      prompt.remove();
      cancelBtn.remove();
      btn.textContent = '[x]';
      delete btn.dataset.confirming;
    });
  }

  async _executeDelete(entryId) {
    try {
      await removeLogEntry(entryId);
      console.log('[Track] entry deleted [id:' + entryId + ']');
      await this._loadDay();
    } catch (err) {
      console.error('[Track] failed to delete entry', err);
    }
  }

  async _renderTrend() {
    const sunday = getWeekSunday(this._selectedDate);
    const weekData = [];

    for (let i = 0; i < 7; i++) {
      const dayTs = addDays(sunday, i);
      const dayStart = startOfDay(dayTs);
      const dayEnd = endOfDay(dayTs);

      let entries;
      try {
        entries = await getConsumptionByDate(dayStart, dayEnd);
      } catch {
        entries = [];
      }

      const resolved = await this._resolveEntries(entries);
      let calories = 0;
      for (const e of resolved) {
        calories += e.macros.calories;
      }

      weekData.push({
        day: i,
        calories,
        target: this._targetCalories,
        isSelected: dayStart === startOfDay(this._selectedDate),
      });
    }

    const container = this.querySelector('.track-trend');
    if (!container) return;

    container.innerHTML = '';
    const trend = document.createElement('weekly-trend');
    trend.weekLabel = `week of ${formatDate(sunday)}`;
    trend.data = weekData;
    container.appendChild(trend);
  }

  _esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
}

customElements.define('track-view', TrackView);

export default TrackView;
