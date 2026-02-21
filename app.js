import { addRoute, start, navigate } from './utils/router.js';
import { open, getAllRecipes, getAllInventory } from './utils/db.js';
import './components/recipe-card.js';
import './components/recipe-form.js';
import './components/recipe-view.js';
import './components/eat-view.js';
import './components/track-view.js';
import './components/command-palette.js';
import './components/help-view.js';
import './components/welcome-view.js';
import { escHtml } from './utils/html.js';

// ── View Management ──

const views = {
  welcome: document.getElementById('view-welcome'),
  cook: document.getElementById('view-cook'),
  eat: document.getElementById('view-eat'),
  track: document.getElementById('view-track'),
  help: document.getElementById('view-help'),
};

const navLinks = document.querySelectorAll('nav a[data-route]');

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.classList.toggle('active', key === name);
  }
  navLinks.forEach((link) => {
    const route = link.dataset.route;
    link.classList.toggle('active', route === '/' + name);
  });
  // Move focus to the new view for screen readers
  const activeView = views[name];
  if (activeView) {
    requestAnimationFrame(() => {
      const heading = activeView.querySelector('h2, h3, [tabindex]');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    });
  }
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

// ── Cook: Recipe Grid ──

async function renderCookGrid() {
  const view = views.cook;
  let recipes, inventoryMap;
  try {
    const [allRecipes, allInv] = await Promise.all([getAllRecipes(), getAllInventory()]);
    recipes = allRecipes;
    inventoryMap = {};
    for (const { recipe, inventory } of allInv) inventoryMap[recipe.id] = inventory;
  } catch (err) {
    console.error('[Cook] failed to load recipes', err);
    view.innerHTML = `<span class="msg-error">failed to load recipes — ${err.message}</span>`;
    return;
  }

  view.innerHTML = `
    <div class="cook-header">
      <h2 class="prompt">cook</h2>
      <button class="btn btn-primary" id="btn-new-recipe">[+ new recipe]</button>
    </div>
    <div class="card-grid" id="recipe-grid"></div>
  `;

  if (recipes.length === 0) {
    view.querySelector('#recipe-grid').innerHTML = `
      <div class="empty-state">
        <p>no recipes yet</p>
        <p>create one with [+ new recipe]</p>
      </div>
    `;
  } else {
    const grid = view.querySelector('#recipe-grid');
    for (const recipe of recipes) {
      const card = document.createElement('recipe-card');
      card.inventory = inventoryMap[recipe.id] || 0;
      card.recipe = recipe;
      grid.appendChild(card);
    }
  }

  view.querySelector('#btn-new-recipe').addEventListener('click', () => {
    navigate('/cook/new');
  });
}

// ── Cook: Recipe Form ──

function renderCookForm(recipeId) {
  const view = views.cook;
  view.innerHTML = '';
  const form = document.createElement('recipe-form');
  if (recipeId && recipeId !== 'new') {
    form.recipeId = recipeId;
  }
  view.appendChild(form);
}

// ── Cook: Recipe View ──

function renderCookView(recipeId) {
  const view = views.cook;
  view.innerHTML = '';
  const recipeView = document.createElement('recipe-view');
  recipeView.recipeId = recipeId;
  view.appendChild(recipeView);
}

// ── Eat: Inventory View ──

function renderEatView() {
  const view = views.eat;
  view.innerHTML = '';
  const eatView = document.createElement('eat-view');
  view.appendChild(eatView);
}

// ── Track: Dashboard ──

function renderTrackView() {
  const view = views.track;
  view.innerHTML = '';
  const trackView = document.createElement('track-view');
  view.appendChild(trackView);
}

// ── Routes ──

addRoute('/', () => {
  showView('welcome');
  const view = views.welcome;
  view.innerHTML = '';
  const welcomeView = document.createElement('welcome-view');
  view.appendChild(welcomeView);
  setStatus('welcome');
});

addRoute('/cook', () => {
  showView('cook');
  renderCookGrid().catch((err) => console.error('[Cook] render failed', err));
  setStatus('cook — recipes');
});

addRoute('/cook/new', () => {
  showView('cook');
  renderCookForm(null);
  setStatus('cook — new recipe');
});

addRoute('/cook/:id', (params) => {
  showView('cook');
  renderCookView(params.id);
  setStatus('cook — viewing recipe');
});

addRoute('/cook/:id/edit', (params) => {
  showView('cook');
  renderCookForm(params.id);
  setStatus('cook — editing recipe');
});

addRoute('/eat', () => {
  showView('eat');
  renderEatView();
  setStatus('eat — inventory');
});

addRoute('/track', () => {
  showView('track');
  renderTrackView();
  setStatus('track — dashboard');
});

addRoute('/help', () => {
  showView('help');
  const view = views.help;
  view.innerHTML = '';
  const helpView = document.createElement('help-view');
  view.appendChild(helpView);
  setStatus('help');
});

// ── Command Palette ──

function getPalette() {
  return document.querySelector('command-palette');
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const palette = getPalette();
    if (palette) {
      if (palette.isOpen) {
        palette.close();
      } else {
        palette.open();
      }
    }
  }
});

// ── Palette Search: filter cook grid ──

window.addEventListener('palette-search', async (e) => {
  const { query, matches } = e.detail;
  const view = views.cook;

  // Wait for cook grid to render (may still be loading from DB)
  let grid = view.querySelector('#recipe-grid');
  if (!grid) {
    await new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        grid = view.querySelector('#recipe-grid');
        if (grid || ++attempts > 20) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  }
  if (!grid) return;

  grid.innerHTML = '';
  if (matches.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>no recipes matching "${escHtml(query)}"</p>
      </div>
    `;
  } else {
    for (const recipe of matches) {
      const card = document.createElement('recipe-card');
      card.recipe = recipe;
      grid.appendChild(card);
    }
  }
  setStatus(`cook — search: "${query}" (${matches.length} results)`);
});

// ── Init ──

async function init() {
  try {
    await open();
    setStatus('ready');
    start();
    console.log('[App] initialized');
  } catch (err) {
    console.error('[App] init failed', err);
    setStatus('ERROR: failed to initialize database');
  }
}

init();
