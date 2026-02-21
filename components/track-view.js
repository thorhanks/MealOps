import { getConsumptionByDate, getLogByDate, getRecipe, getSettings, addLogEntry, removeLogEntry, updateSettings } from '../utils/db.js';
import './body-gauge.js';
import './weekly-trend.js';
import './adhoc-food.js';
import './num-input.js';
import './macro-pie.js';
import { escHtml } from '../utils/html.js';
import { startOfDay, endOfDay, formatDate, getWeekSunday, addDays } from '../utils/date.js';

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

        <div class="track-adhoc-panel" hidden>
          <div class="track-adhoc-panel__header">
            <span class="prompt">ad-hoc food entry</span>
          </div>
          <div class="track-adhoc"></div>
        </div>

        <div class="track-columns">
          <div class="track-charts">
            <div class="track-trend"></div>
            <div class="track-gauge"></div>
            <div class="track-pie"></div>
          </div>
          <div class="track-log"></div>
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

    // Ad-hoc food panel (content replacement)
    const adhocPanel = this.querySelector('.track-adhoc-panel');
    const dateNav = this.querySelector('.track-date-nav');
    const columns = this.querySelector('.track-columns');
    const adhoc = document.createElement('adhoc-food');
    adhoc.date = this._selectedDate;
    this.querySelector('.track-adhoc').appendChild(adhoc);

    const showAdhoc = () => {
      dateNav.hidden = true;
      columns.hidden = true;
      adhocPanel.hidden = false;
      const nameInput = adhocPanel.querySelector('.adhoc-food__name');
      if (nameInput) nameInput.focus();
    };

    const hideAdhoc = () => {
      adhocPanel.hidden = true;
      dateNav.hidden = false;
      columns.hidden = false;
    };

    this.addEventListener('click', (e) => {
      if (e.target.closest('.track-date-nav__adhoc')) showAdhoc();
    });

    this.addEventListener('keydown', (e) => {
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.target.closest('input, textarea, select, num-input, adhoc-food')) {
        e.preventDefault();
        showAdhoc();
      }
    });

    this.addEventListener('adhoc-cancelled', () => hideAdhoc());
    this.addEventListener('adhoc-logged', (e) => {
      this._handleAdhocLogged(e.detail);
      hideAdhoc();
    });

    // Click day in weekly trend to navigate
    this.addEventListener('trend-day-selected', (e) => {
      const sunday = getWeekSunday(this._selectedDate);
      this._selectedDate = startOfDay(addDays(sunday, e.detail.dayIndex));
      this._updateDateLabel();
      this._loadDay().catch((err) => console.error('[Track] load failed', err));
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
    await updateSettings((s) => { s.targetCalories = value; });
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
    this._renderPie();
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
    let gauge = container.querySelector('body-gauge');
    if (!gauge) {
      gauge = document.createElement('body-gauge');
      gauge.setAttribute('label', 'kcal');
      gauge.setAttribute('current', totals.calories);
      gauge.setAttribute('target', this._targetCalories);
      container.appendChild(gauge);
    } else {
      gauge.setAttribute('current', totals.calories);
      gauge.setAttribute('target', this._targetCalories);
    }
  }

  _renderPie() {
    const container = this.querySelector('.track-pie');
    if (!container) return;

    const totals = this._sumMacros();
    let pie = container.querySelector('macro-pie');
    if (!pie) {
      pie = document.createElement('macro-pie');
      container.appendChild(pie);
    }
    pie.data = { protein: totals.protein, carbs: totals.carbs, fat: totals.fat };
  }

  _renderLog() {
    const container = this.querySelector('.track-log');
    if (!container) return;

    if (this._resolvedEntries.length === 0) {
      container.innerHTML = `
        <div class="consumption-log">
          <div class="consumption-log__header">
            <h3 class="prompt">consumption log [${formatDate(this._selectedDate)}]</h3>
            <button class="btn btn-primary track-date-nav__adhoc">[+ food]</button>
          </div>
          <div class="consumption-log__empty">no entries for this day</div>
        </div>
      `;
      return;
    }

    const rows = this._resolvedEntries.map((e) => {
      const time = new Date(e.date);
      const h24 = time.getHours();
      const h12 = h24 % 12 || 12;
      const mm = String(time.getMinutes()).padStart(2, '0');
      const ampm = h24 < 12 ? 'am' : 'pm';
      const hh = `${h12}:${mm}${ampm}`;
      const m = e.macros;

      return `
        <div class="consumption-log__entry" data-id="${e.id}">
          <span class="consumption-log__time">${hh}</span>
          <span class="consumption-log__name">${escHtml(e.displayName)}</span>
          <span class="consumption-log__detail">${escHtml(e.displayDetail)}</span>
          <span class="consumption-log__macros">[p:${Math.round(m.protein)}g c:${Math.round(m.carbs)}g f:${Math.round(m.fat)}g cal:${Math.round(m.calories)}]</span>
          <button class="btn btn-danger consumption-log__delete">[x]</button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="consumption-log">
        <div class="consumption-log__header">
          <h3 class="prompt">consumption log [${formatDate(this._selectedDate)}]</h3>
          <button class="btn btn-primary track-date-nav__adhoc">[+ food]</button>
        </div>
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
    const weekStart = startOfDay(sunday);
    const weekEnd = endOfDay(addDays(sunday, 6));

    let allEntries;
    try {
      allEntries = (await getLogByDate(weekStart, weekEnd)).filter((e) => e.type === 'consumption');
    } catch {
      allEntries = [];
    }

    // Bucket entries by day index (0=Sun .. 6=Sat)
    const buckets = [[], [], [], [], [], [], []];
    for (const entry of allEntries) {
      const dayIndex = Math.floor((entry.date - weekStart) / 86400000);
      if (dayIndex >= 0 && dayIndex < 7) buckets[dayIndex].push(entry);
    }

    const resolved = await this._resolveEntries(allEntries);
    // Build a map of entry id → resolved macros
    const resolvedById = {};
    for (const r of resolved) resolvedById[r.id] = r;

    const weekData = [];
    for (let i = 0; i < 7; i++) {
      let calories = 0;
      for (const entry of buckets[i]) {
        const r = resolvedById[entry.id];
        if (r) calories += r.macros.calories;
      }

      weekData.push({
        day: i,
        calories,
        target: this._targetCalories,
        isSelected: startOfDay(addDays(sunday, i)) === startOfDay(this._selectedDate),
      });
    }

    const container = this.querySelector('.track-trend');
    if (!container) return;

    let trend = container.querySelector('weekly-trend');
    if (!trend) {
      trend = document.createElement('weekly-trend');
      container.appendChild(trend);
    }
    trend.weekLabel = `week of ${formatDate(sunday)}`;
    trend.data = weekData;
  }

}

customElements.define('track-view', TrackView);

export default TrackView;
