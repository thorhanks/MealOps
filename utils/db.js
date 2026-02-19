const DB_NAME = 'mealops';
const DB_VERSION = 1;

let dbInstance = null;

function open() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      migrate(db, event.oldVersion, DB_VERSION);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      dbInstance.onclose = () => { dbInstance = null; };
      console.log('[DB] opened', DB_NAME, 'v' + DB_VERSION);
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[DB] open failed', event.target.error);
      reject(event.target.error);
    };
  });
}

function migrate(db, oldVersion, newVersion) {
  console.log('[DB] migrating', oldVersion, '->', newVersion);

  if (oldVersion < 1) {
    // recipes
    const recipes = db.createObjectStore('recipes', { keyPath: 'id' });
    recipes.createIndex('name', 'name', { unique: false });
    recipes.createIndex('deleted', 'deleted', { unique: false });

    // servingsLog
    const log = db.createObjectStore('servingsLog', { keyPath: 'id' });
    log.createIndex('recipeId', 'recipeId', { unique: false });
    log.createIndex('type', 'type', { unique: false });
    log.createIndex('date', 'date', { unique: false });
    log.createIndex('type_date', ['type', 'date'], { unique: false });

    // ingredientCache
    const cache = db.createObjectStore('ingredientCache', { keyPath: 'id' });
    cache.createIndex('name', 'name', { unique: false });
    cache.createIndex('cached', 'cached', { unique: false });

    // settings
    db.createObjectStore('settings', { keyPath: 'id' });
  }
}

// ── Generic CRUD ──

function tx(storeName, mode = 'readonly') {
  return open().then((db) => {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  });
}

function getAll(storeName) {
  return tx(storeName).then((store) => {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function getById(storeName, id) {
  return tx(storeName).then((store) => {
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function getByIndex(storeName, indexName, value) {
  return tx(storeName).then((store) => {
    return new Promise((resolve, reject) => {
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function put(storeName, item) {
  return tx(storeName, 'readwrite').then((store) => {
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function remove(storeName, id) {
  return tx(storeName, 'readwrite').then((store) => {
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

// ── Recipes ──

function getAllRecipes() {
  return getAll('recipes').then((recipes) =>
    recipes.filter((r) => !r.deleted)
  );
}

function getRecipe(id) {
  return getById('recipes', id);
}

function saveRecipe(recipe) {
  const now = Date.now();
  if (!recipe.id) {
    recipe.id = crypto.randomUUID();
    recipe.created = now;
    recipe.deleted = false;
  }
  recipe.updated = now;
  return put('recipes', recipe);
}

function deleteRecipe(id) {
  return getRecipe(id).then((recipe) => {
    if (!recipe) throw new Error('Recipe not found [id:' + id + ']');
    recipe.deleted = true;
    recipe.updated = Date.now();
    return put('recipes', recipe);
  });
}

// ── Servings Log ──

function addLogEntry(entry) {
  if (!entry.id) {
    entry.id = crypto.randomUUID();
    entry.created = Date.now();
  }
  if (!entry.date) entry.date = Date.now();
  return put('servingsLog', entry);
}

function removeLogEntry(id) {
  return remove('servingsLog', id);
}

function getLogEntry(id) {
  return getById('servingsLog', id);
}

function getLogByRecipe(recipeId) {
  return getByIndex('servingsLog', 'recipeId', recipeId);
}

function getLogByDate(dateStart, dateEnd) {
  return tx('servingsLog').then((store) => {
    return new Promise((resolve, reject) => {
      const index = store.index('date');
      const range = IDBKeyRange.bound(dateStart, dateEnd);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function getConsumptionByDate(dateStart, dateEnd) {
  return getLogByDate(dateStart, dateEnd).then((entries) => {
    return entries.filter((e) => e.type === 'consumption');
  });
}

function getInventory(recipeId) {
  return getLogByRecipe(recipeId).then((entries) => {
    let total = 0;
    for (const entry of entries) {
      if (entry.type === 'production') total += entry.servings;
      else if (entry.type === 'consumption') total -= entry.servings;
    }
    return Math.max(0, total);
  });
}

async function getAllInventory() {
  const recipes = await getAllRecipes();
  const pairs = await Promise.all(
    recipes.map(async (recipe) => ({
      recipe,
      inventory: await getInventory(recipe.id),
    }))
  );
  return pairs.filter((p) => p.inventory > 0);
}

// ── Ingredient Cache ──

function getCachedIngredient(name) {
  return getByIndex('ingredientCache', 'name', name).then((results) => {
    return results.length > 0 ? results[0] : null;
  });
}

function cacheIngredient(ingredient) {
  ingredient.cached = Date.now();
  return put('ingredientCache', ingredient);
}

// ── Settings ──

const SETTINGS_ID = 'user-settings';

function getSettings() {
  return getById('settings', SETTINGS_ID).then((settings) => {
    return settings || { id: SETTINGS_ID, targetCalories: 2000, created: Date.now(), updated: Date.now() };
  });
}

function saveSettings(settings) {
  settings.id = SETTINGS_ID;
  settings.updated = Date.now();
  if (!settings.created) settings.created = Date.now();
  return put('settings', settings);
}

// ── Bulk Operations (import/export) ──

function getAllRecipesRaw() {
  return getAll('recipes');
}

function getAllLogEntries() {
  return getAll('servingsLog');
}

function getAllCachedIngredients() {
  return getAll('ingredientCache');
}

function bulkPut(storeName, records) {
  return open().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      let count = 0;

      transaction.oncomplete = () => resolve(count);
      transaction.onerror = () => reject(transaction.error);

      for (const record of records) {
        store.put(record);
        count++;
      }
    });
  });
}

// ── Public API ──

export {
  open,
  getAllRecipes,
  getRecipe,
  saveRecipe,
  deleteRecipe,
  addLogEntry,
  removeLogEntry,
  getLogEntry,
  getLogByRecipe,
  getLogByDate,
  getConsumptionByDate,
  getInventory,
  getAllInventory,
  getCachedIngredient,
  cacheIngredient,
  getSettings,
  saveSettings,
  getAllRecipesRaw,
  getAllLogEntries,
  getAllCachedIngredients,
  bulkPut,
};
