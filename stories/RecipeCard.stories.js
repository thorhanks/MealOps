import { expect, userEvent, within, fn } from '@storybook/test';
import '../components/recipe-card.js';

const sampleRecipe = {
  id: 'test-001',
  name: 'Chicken Soup',
  ingredients: [
    { name: 'Chicken breast', amount: 500, unit: 'g', nutrition: { protein: 155, carbs: 0, fat: 3.6, calories: 825 }, source: 'usda-api' },
    { name: 'Carrots', amount: 200, unit: 'g', nutrition: { protein: 1.8, carbs: 19.2, fat: 0.5, calories: 82 }, source: 'usda-api' },
    { name: 'Noodles', amount: 300, unit: 'g', nutrition: { protein: 15, carbs: 93, fat: 2.4, calories: 474 }, source: 'manual' },
  ],
  instructions: '1. Boil chicken\n2. Add vegetables\n3. Add noodles\n4. Simmer 20min',
  servings: 8,
  macros: { protein: 21.5, carbs: 14, fat: 0.8, calories: 172.6 },
  deleted: false,
  created: Date.now(),
  updated: Date.now(),
};

export default {
  title: 'Components/RecipeCard',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

function createCard(recipe) {
  const card = document.createElement('recipe-card');
  // Set recipe directly — bypasses DB-dependent _loadInventory
  card._recipe = recipe;
  card._inventory = 0;
  card.render();
  return card;
}

function createCardWithInventory(recipe, inventory) {
  const card = document.createElement('recipe-card');
  card._recipe = recipe;
  card._inventory = inventory;
  card.render();
  return card;
}

export const Default = {
  render: () => createCardWithInventory(sampleRecipe, 0),
};

export const WithInventory = {
  render: () => createCardWithInventory(sampleRecipe, 7),
};

export const HighInventory = {
  render: () => createCardWithInventory(sampleRecipe, 24),
};

export const LongName = {
  render: () => createCardWithInventory({
    ...sampleRecipe,
    name: 'Mediterranean Roasted Vegetable Quinoa Bowl',
  }, 3),
};

export const ZeroMacros = {
  render: () => createCardWithInventory({
    ...sampleRecipe,
    name: 'Empty Recipe',
    macros: { protein: 0, carbs: 0, fat: 0, calories: 0 },
  }, 0),
};

export const MultipleCards = {
  render: () => {
    const grid = document.createElement('div');
    grid.className = 'card-grid';

    const recipes = [
      { ...sampleRecipe, id: '1', name: 'Chicken Soup' },
      { ...sampleRecipe, id: '2', name: 'Veggie Stir-Fry', macros: { protein: 12, carbs: 35, fat: 8, calories: 260 } },
      { ...sampleRecipe, id: '3', name: 'Pasta Bake', macros: { protein: 18, carbs: 45, fat: 12, calories: 360 } },
      { ...sampleRecipe, id: '4', name: 'Lentil Curry', macros: { protein: 15, carbs: 40, fat: 6, calories: 274 } },
    ];
    const inventories = [7, 2, 0, 15];

    recipes.forEach((r, i) => {
      grid.appendChild(createCardWithInventory(r, inventories[i]));
    });

    return grid;
  },
};

export const ClickMade = {
  render: () => createCardWithInventory(sampleRecipe, 3),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const madeButton = canvas.getByText('[+ made]');

    await userEvent.click(madeButton);

    // Should show inline prompt with servings input
    const input = canvasElement.querySelector('input[type="number"]');
    await expect(input).toBeTruthy();
    await expect(input.value).toBe('1');

    // Test cancel
    const cancelButton = canvas.getByText('[cancel]');
    await userEvent.click(cancelButton);

    // Should return to normal actions
    await expect(canvas.getByText('[+ made]')).toBeTruthy();
  },
};

export const ClickDelete = {
  render: () => createCardWithInventory(sampleRecipe, 0),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButton = canvas.getByText('[x]');

    await userEvent.click(deleteButton);

    // Should show confirmation prompt
    await expect(canvas.getByText('[y]')).toBeTruthy();
    await expect(canvas.getByText('[n]')).toBeTruthy();

    // Test cancel
    const noButton = canvas.getByText('[n]');
    await userEvent.click(noButton);

    // Should return to normal actions
    await expect(canvas.getByText('[x]')).toBeTruthy();
  },
};
