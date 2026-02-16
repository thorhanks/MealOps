import { getSettings, saveSettings } from './db.js';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Nutrient IDs we care about
const NUTRIENT_IDS = {
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  calories: 1008,
};

let debounceTimer = null;
let debounceReject = null;

/**
 * Get the stored API key from settings, or null if not set.
 */
async function getApiKey() {
  const settings = await getSettings();
  return settings.usdaApiKey || null;
}

/**
 * Save the API key to settings.
 */
async function saveApiKey(key) {
  const settings = await getSettings();
  settings.usdaApiKey = key;
  await saveSettings(settings);
}

/**
 * Search USDA FoodData Central for foods matching a query.
 * Returns array of { fdcId, description, brandName, nutrients }.
 */
async function searchFoods(query, pageSize = 10) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No USDA API key configured');

  const url = `${BASE_URL}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 403) throw new Error('Invalid USDA API key');
    throw new Error('USDA API error: ' + response.status);
  }

  const data = await response.json();
  if (!data.foods) return [];

  return data.foods.map((food) => ({
    fdcId: String(food.fdcId),
    description: food.description,
    brandName: food.brandName || null,
    nutrients: extractNutrients(food.foodNutrients || []),
  }));
}

/**
 * Debounced version of searchFoods.
 */
function searchFoodsDebounced(query, pageSize = 10, delayMs = 350) {
  return new Promise((resolve, reject) => {
    clearTimeout(debounceTimer);
    if (debounceReject) {
      debounceReject(new DOMException('Debounced', 'AbortError'));
      debounceReject = null;
    }
    debounceReject = reject;
    debounceTimer = setTimeout(() => {
      debounceReject = null;
      searchFoods(query, pageSize).then(resolve).catch(reject);
    }, delayMs);
  });
}

/**
 * Extract the 4 macros we care about from USDA nutrient array.
 * Returns { protein, fat, carbs, calories } per 100g.
 */
function extractNutrients(foodNutrients) {
  const result = { protein: 0, fat: 0, carbs: 0, calories: 0 };

  for (const n of foodNutrients) {
    const id = n.nutrientId || (n.nutrient && n.nutrient.id);
    const value = n.value ?? n.amount ?? 0;

    if (id === NUTRIENT_IDS.protein) result.protein = value;
    else if (id === NUTRIENT_IDS.fat) result.fat = value;
    else if (id === NUTRIENT_IDS.carbs) result.carbs = value;
    else if (id === NUTRIENT_IDS.calories) result.calories = value;
  }

  return result;
}

/**
 * Scale nutrients from per-100g to the actual gram amount.
 */
function scaleNutrients(nutrientsPer100g, grams) {
  const factor = grams / 100;
  return {
    protein: Math.round(nutrientsPer100g.protein * factor * 10) / 10,
    fat: Math.round(nutrientsPer100g.fat * factor * 10) / 10,
    carbs: Math.round(nutrientsPer100g.carbs * factor * 10) / 10,
    calories: Math.round(nutrientsPer100g.calories * factor * 10) / 10,
  };
}

export {
  getApiKey,
  saveApiKey,
  searchFoods,
  searchFoodsDebounced,
  extractNutrients,
  scaleNutrients,
};
