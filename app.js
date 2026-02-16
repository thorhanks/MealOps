import { addRoute, start, navigate } from './utils/router.js';
import { open, getAllRecipes } from './utils/db.js';
import './components/recipe-card.js';
import './components/recipe-form.js';
import './components/recipe-view.js';

// ── View Management ──

const views = {
  cook: document.getElementById('view-cook'),
  eat: document.getElementById('view-eat'),
  track: document.getElementById('view-track'),
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
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

// ── Cook: Recipe Grid ──

async function renderCookGrid() {
  const view = views.cook;
  let recipes;
  try {
    recipes = await getAllRecipes();
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

// ── Routes ──

addRoute('/cook', () => {
  showView('cook');
  renderCookGrid();
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
  setStatus('eat — inventory');
});

addRoute('/track', () => {
  showView('track');
  setStatus('track — dashboard');
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
