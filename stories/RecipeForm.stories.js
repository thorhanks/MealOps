import { expect, userEvent, within } from '@storybook/test';
import '../components/recipe-form.js';

const existingRecipe = {
  id: 'edit-001',
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
  ],
  instructions: '1. Boil chicken\n2. Add vegetables\n3. Simmer 20min',
  servings: 8,
  macros: { protein: 19.6, carbs: 2.4, fat: 0.5, calories: 113.4 },
  deleted: false,
  created: Date.now(),
  updated: Date.now(),
};

export default {
  title: 'Components/RecipeForm',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

function createForm() {
  const form = document.createElement('recipe-form');
  // Let it render in create mode (default)
  return form;
}

function createEditForm(recipe) {
  const form = document.createElement('recipe-form');
  // Directly set internal state to bypass DB lookup
  form._mode = 'edit';
  form._recipe = recipe;
  form._ingredients = recipe.ingredients.map((ing) => ({ ...ing }));
  return form;
}

export const CreateMode = {
  render: () => createForm(),
};

export const EditMode = {
  render: () => createEditForm(existingRecipe),
};

export const AddIngredient = {
  render: () => createForm(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click add ingredient
    const addBtn = canvas.getByText('[+ add ingredient]');
    await userEvent.click(addBtn);

    // Should have an ingredient row
    const nameInputs = canvasElement.querySelectorAll('.ingredient-row__name');
    await expect(nameInputs.length).toBe(1);

    // Add another
    await userEvent.click(addBtn);
    const nameInputs2 = canvasElement.querySelectorAll('.ingredient-row__name');
    await expect(nameInputs2.length).toBe(2);
  },
};

export const ManualNutrition = {
  render: () => createForm(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Add an ingredient
    await userEvent.click(canvas.getByText('[+ add ingredient]'));

    // Type ingredient name
    const nameInput = canvasElement.querySelector('.ingredient-row__name');
    await userEvent.type(nameInput, 'Rice');

    // Set amount (target the inner <input> inside <num-input>)
    const amountInput = canvasElement.querySelector('.ingredient-row__amount input');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '200');

    // Click manual entry
    const manualBtn = canvasElement.querySelector('.ingredient-row__manual');
    await userEvent.click(manualBtn);

    // Should show manual macro fields
    const proteinInput = canvasElement.querySelector('input[data-macro="protein"]');
    await expect(proteinInput).toBeTruthy();

    // Enter manual macros
    await userEvent.clear(proteinInput);
    await userEvent.type(proteinInput, '14');

    const caloriesInput = canvasElement.querySelector('input[data-macro="calories"]');
    await userEvent.clear(caloriesInput);
    await userEvent.type(caloriesInput, '260');
  },
};

export const ValidationError = {
  render: () => createForm(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Try to save without a name
    const saveBtn = canvas.getByText('[create]');
    await userEvent.click(saveBtn);

    // Should show error
    const status = canvasElement.querySelector('#rf-status');
    await expect(status.textContent).toContain('recipe name is required');
  },
};

export const RemoveIngredient = {
  render: () => createEditForm(existingRecipe),
  play: async ({ canvasElement }) => {
    // Count initial ingredients
    const initialRows = canvasElement.querySelectorAll('.ingredient-row');
    await expect(initialRows.length).toBe(2);

    // Remove first ingredient
    const removeBtn = canvasElement.querySelector('.ingredient-row__remove');
    await userEvent.click(removeBtn);

    // Should have one less
    const afterRows = canvasElement.querySelectorAll('.ingredient-row');
    await expect(afterRows.length).toBe(1);
  },
};
