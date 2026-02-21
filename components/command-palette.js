import { navigate } from '../utils/router.js';
import { exportData, importFromFile } from '../utils/data-io.js';
import { getAllRecipes } from '../utils/db.js';
import { escHtml } from '../utils/html.js';

const COMMANDS = [
  { id: 'cook', label: 'cook', hint: 'go to recipes', action: () => navigate('/cook') },
  { id: 'eat', label: 'eat', hint: 'go to inventory', action: () => navigate('/eat') },
  { id: 'track', label: 'track', hint: 'go to daily tracker', action: () => navigate('/track') },
  { id: 'add-recipe', label: 'add recipe', hint: 'create new recipe', action: () => navigate('/cook/new') },
  { id: 'export', label: 'export data', hint: 'download JSON backup', action: null },
  { id: 'import', label: 'import data', hint: 'restore from JSON', action: null },
  { id: 'help', label: 'help', hint: 'show help page', action: () => navigate('/help') },
  { id: 'shortcuts', label: 'shortcuts', hint: 'keyboard shortcuts', action: () => navigate('/help') },
];

class CommandPalette extends HTMLElement {
  constructor() {
    super();
    this._open = false;
    this._selectedIndex = 0;
    this._filtered = [...COMMANDS];
    this._query = '';
    this._statusMsg = '';

  }

  connectedCallback() {
    this.render();
  }

  open() {
    this._open = true;
    this._query = '';
    this._selectedIndex = 0;
    this._statusMsg = '';
    this._filtered = [...COMMANDS];
    this.render();
    const input = this.querySelector('.command-palette__input');
    if (input) input.focus();
  }

  close() {
    this._open = false;
    this._statusMsg = '';
    this.render();
  }

  get isOpen() {
    return this._open;
  }

  render() {
    this.innerHTML = `
      <div class="command-palette ${this._open ? 'open' : ''}" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="command-palette__container">
          <input class="command-palette__input" type="text"
            placeholder="> type a command..." value="${escHtml(this._query)}"
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant="${this._selectedIndex >= 0 ? `palette-item-${this._selectedIndex}` : ''}">
          <div class="command-palette__list" id="palette-list" role="listbox">
            ${this._renderItems()}
          </div>
          ${this._statusMsg ? `<div class="command-palette__status">${escHtml(this._statusMsg)}</div>` : ''}
        </div>
      </div>
    `;
    this._bindEvents();
  }

  _renderItems() {
    if (this._filtered.length === 0) {
      const q = this._query.trim();
      if (q.toLowerCase().startsWith('search ') && q.length > 7) {
        return `<div class="command-palette__item selected" data-action="search" role="option" id="palette-item-0" aria-selected="true">
          <span class="command-palette__item-label">search recipes: "${escHtml(q.slice(7))}"</span>
        </div>`;
      }
      return '<div class="command-palette__empty">no matching commands</div>';
    }

    return this._filtered.map((cmd, i) => `
      <div class="command-palette__item ${i === this._selectedIndex ? 'selected' : ''}" data-index="${i}" role="option" id="palette-item-${i}" aria-selected="${i === this._selectedIndex}">
        <span class="command-palette__item-label">${escHtml(cmd.label)}</span>
        <span class="command-palette__item-hint">${escHtml(cmd.hint)}</span>
      </div>
    `).join('');
  }

  _bindEvents() {
    const input = this.querySelector('.command-palette__input');
    if (!input) return;

    input.addEventListener('input', (e) => {
      this._query = e.target.value;
      this._filter();
      this._selectedIndex = 0;
      this._renderList();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._moveSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._execute();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    // backdrop click
    const backdrop = this.querySelector('.command-palette');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
    }

    // item click
    this.querySelectorAll('.command-palette__item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = item.dataset.index;
        if (idx !== undefined) this._selectedIndex = parseInt(idx, 10);
        this._execute();
      });
    });
  }

  _filter() {
    const q = this._query.toLowerCase().trim();
    if (!q) {
      this._filtered = [...COMMANDS];
      return;
    }
    this._filtered = COMMANDS.filter((cmd) =>
      cmd.label.toLowerCase().includes(q)
    );
  }

  _moveSelection(dir) {
    const max = this._filtered.length || 1;
    this._selectedIndex = Math.max(0, Math.min(max - 1, this._selectedIndex + dir));
    this._renderList();
  }

  _renderList() {
    const list = this.querySelector('.command-palette__list');
    if (list) {
      list.innerHTML = this._renderItems();
      list.querySelectorAll('.command-palette__item').forEach((item) => {
        item.addEventListener('click', () => {
          const idx = item.dataset.index;
          if (idx !== undefined) this._selectedIndex = parseInt(idx, 10);
          this._execute();
        });
      });
    }
  }

  async _execute() {
    const q = this._query.trim();

    // search command (typed directly)
    if (q.toLowerCase().startsWith('search ') && q.length > 7) {
      const searchQuery = q.slice(7).trim();
      await this._searchRecipes(searchQuery);
      return;
    }

    const cmd = this._filtered[this._selectedIndex];
    if (!cmd) return;

    if (cmd.id === 'export') {
      await this._doExport();
      return;
    }

    if (cmd.id === 'import') {
      await this._doImport();
      return;
    }

    if (cmd.action) {
      this.close();
      cmd.action();
    }
  }

  async _doExport() {
    try {
      this._statusMsg = '[...] exporting data...';
      this._updateStatus();
      const counts = await exportData();
      this._statusMsg = `OK: exported ${counts.recipes} recipes, ${counts.servingsLog} log entries`;
      this._updateStatus();
      setTimeout(() => this.close(), 1500);
    } catch (err) {
      this._statusMsg = `ERROR: ${err.message}`;
      this._updateStatus();
    }
  }

  async _doImport() {
    try {
      this._statusMsg = '[...] select file...';
      this._updateStatus();
      const counts = await importFromFile();
      this._statusMsg = `OK: imported ${counts.recipes} recipes, ${counts.servingsLog} log entries`;
      this._updateStatus();
      setTimeout(() => {
        this.close();
        // reload current view
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 1500);
    } catch (err) {
      if (err.message === 'no file selected') {
        this._statusMsg = '';
        this._updateStatus();
        return;
      }
      this._statusMsg = `ERROR: ${err.message}`;
      this._updateStatus();
    }
  }

  async _searchRecipes(query) {
    try {
      const recipes = await getAllRecipes();
      const q = query.toLowerCase();
      const matches = recipes.filter((r) => r.name.toLowerCase().includes(q));

      this.close();
      navigate('/cook');

      // dispatch search event for cook view to filter
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('palette-search', { detail: { query, matches } }));
      }, 100);
    } catch (err) {
      this._statusMsg = `ERROR: ${err.message}`;
      this._updateStatus();
    }
  }

  _updateStatus() {
    const el = this.querySelector('.command-palette__status');
    if (el) {
      el.textContent = this._statusMsg;
    } else if (this._statusMsg) {
      const container = this.querySelector('.command-palette__container');
      if (container) {
        const div = document.createElement('div');
        div.className = 'command-palette__status';
        div.textContent = this._statusMsg;
        container.appendChild(div);
      }
    }
  }
}

customElements.define('command-palette', CommandPalette);
export default CommandPalette;
