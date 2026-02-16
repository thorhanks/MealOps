import { addRoute, start, navigate } from './utils/router.js';
import { open } from './utils/db.js';

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

// ── Routes ──

addRoute('/cook', () => {
  showView('cook');
  setStatus('cook — recipes');
});

addRoute('/cook/:id', (params) => {
  showView('cook');
  setStatus('cook — viewing recipe ' + params.id);
});

addRoute('/cook/:id/edit', (params) => {
  showView('cook');
  setStatus('cook — editing recipe ' + params.id);
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
