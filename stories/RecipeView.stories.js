import '../components/recipe-view.js';

const sampleRecipe = {
  id: 'view-001',
  name: 'Chicken Soup',
  ingredients: [
    {
      name: 'Chicken breast', amount: 500, unit: 'g', gramsEquivalent: 500,
      nutrition: { protein: 155, carbs: 0, fat: 3.6, calories: 825 },
      source: 'usda-api', usdaId: '171077',
    },
    {
      name: 'Carrots', amount: 200, unit: 'g', gramsEquivalent: 200,
      nutrition: { protein: 1.8, carbs: 19.2, fat: 0.5, calories: 82 },
      source: 'manual', usdaId: null,
    },
    {
      name: 'Egg noodles', amount: 300, unit: 'g', gramsEquivalent: 300,
      nutrition: { protein: 15, carbs: 93, fat: 2.4, calories: 474 },
      source: 'usda-api', usdaId: '168874',
    },
  ],
  instructions: '1. Boil chicken breast in salted water for 20 minutes\n2. Remove and shred chicken\n3. Add diced carrots to the broth\n4. Cook for 10 minutes\n5. Add egg noodles and shredded chicken\n6. Simmer until noodles are tender\n7. Season with salt and pepper',
  servings: 8,
  macros: { protein: 21.5, carbs: 14, fat: 0.8, calories: 172.6 },
  deleted: false,
  created: Date.now(),
  updated: Date.now(),
};

export default {
  title: 'Components/RecipeView',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

function createView(recipe, inventory) {
  const view = document.createElement('recipe-view');
  // Set internal state directly to bypass DB
  view._recipe = recipe;
  view._inventory = inventory;
  view.render();
  return view;
}

export const Default = {
  render: () => createView(sampleRecipe, 7),
};

export const NoInventory = {
  render: () => createView(sampleRecipe, 0),
};

export const HighInventory = {
  render: () => createView(sampleRecipe, 24),
};

export const NoIngredients = {
  render: () => createView({
    ...sampleRecipe,
    name: 'Quick Snack',
    ingredients: [],
    instructions: 'Just grab and go',
    macros: { protein: 0, carbs: 0, fat: 0, calories: 0 },
  }, 0),
};

export const LongInstructions = {
  render: () => createView({
    ...sampleRecipe,
    name: 'Complex Dish',
    instructions: Array.from({ length: 15 }, (_, i) =>
      `${i + 1}. Step ${i + 1}: Do something detailed and important for the recipe that requires careful attention`
    ).join('\n'),
  }, 5),
};
