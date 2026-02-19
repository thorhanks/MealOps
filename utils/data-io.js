import {
  getAllRecipesRaw,
  getAllLogEntries,
  getAllCachedIngredients,
  getSettings,
  bulkPut,
  saveSettings,
} from './db.js';

const EXPORT_VERSION = 1;

async function exportData() {
  const [recipes, servingsLog, ingredientCache, settings] = await Promise.all([
    getAllRecipesRaw(),
    getAllLogEntries(),
    getAllCachedIngredients(),
    getSettings(),
  ]);

  const payload = {
    version: EXPORT_VERSION,
    exported: Date.now(),
    recipes,
    servingsLog,
    ingredientCache,
    settings,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mealops-export-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('[DataIO] exported', recipes.length, 'recipes,', servingsLog.length, 'log entries');
  return { recipes: recipes.length, servingsLog: servingsLog.length, ingredientCache: ingredientCache.length };
}

function validateImport(data) {
  if (!data || typeof data !== 'object') throw new Error('invalid JSON structure');
  if (!data.version) throw new Error('missing version field');
  if (!Array.isArray(data.recipes)) throw new Error('missing or invalid recipes array');
  if (!Array.isArray(data.servingsLog)) throw new Error('missing or invalid servingsLog array');
  if (!Array.isArray(data.ingredientCache)) throw new Error('missing or invalid ingredientCache array');
  return true;
}

function importFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    let handled = false;

    input.addEventListener('change', async () => {
      handled = true;
      const file = input.files[0];
      if (!file) {
        reject(new Error('no file selected'));
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        validateImport(data);

        const counts = await importData(data);
        resolve(counts);
      } catch (err) {
        reject(err);
      }
    });

    // Some browsers don't fire change when dialog is canceled.
    // Use focus as a fallback to detect the dialog closing.
    window.addEventListener('focus', function onFocus() {
      window.removeEventListener('focus', onFocus);
      setTimeout(() => {
        if (!handled) reject(new Error('no file selected'));
      }, 300);
    }, { once: true });

    input.click();
  });
}

async function importData(data) {
  const results = await Promise.all([
    bulkPut('recipes', data.recipes),
    bulkPut('servingsLog', data.servingsLog),
    bulkPut('ingredientCache', data.ingredientCache),
  ]);

  if (data.settings) {
    await saveSettings(data.settings);
  }

  const counts = {
    recipes: results[0],
    servingsLog: results[1],
    ingredientCache: results[2],
  };

  console.log('[DataIO] imported', counts.recipes, 'recipes,', counts.servingsLog, 'log entries');
  return counts;
}

export { exportData, importFromFile, importData, validateImport };
