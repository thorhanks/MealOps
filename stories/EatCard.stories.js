import { expect, userEvent, within } from '@storybook/test';
import '../components/eat-card.js';

const sampleRecipe = {
  id: 'test-001',
  name: 'Chicken Soup',
  ingredients: [],
  instructions: '',
  servings: 8,
  macros: { protein: 21.5, carbs: 14, fat: 0.8, calories: 172.6 },
  deleted: false,
  created: Date.now(),
  updated: Date.now(),
};

export default {
  title: 'Components/EatCard',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

function createCard(recipe, inventory) {
  const card = document.createElement('eat-card');
  card._recipe = recipe;
  card._inventory = inventory;
  card.render();
  return card;
}

export const FewServings = {
  render: () => createCard(sampleRecipe, 2),
};

export const SomeServings = {
  render: () => createCard(sampleRecipe, 7),
};

export const ManyServings = {
  render: () => createCard(sampleRecipe, 15),
};

export const SingleServing = {
  render: () => createCard(sampleRecipe, 1),
};

export const LongName = {
  render: () => createCard({
    ...sampleRecipe,
    name: 'Mediterranean Roasted Vegetable Quinoa Bowl',
  }, 5),
};

export const ClickEat = {
  render: () => createCard(sampleRecipe, 5),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eatButton = canvas.getByText('[eat]');

    await userEvent.click(eatButton);

    // Should show inline prompt with servings input
    const input = canvasElement.querySelector('input[type="number"]');
    await expect(input).toBeTruthy();
    await expect(input.value).toBe('1');

    // Test cancel
    const cancelButton = canvas.getByText('[cancel]');
    await userEvent.click(cancelButton);

    // Should return to normal actions
    await expect(canvas.getByText('[eat]')).toBeTruthy();
  },
};

export const MultipleCards = {
  render: () => {
    const grid = document.createElement('div');
    grid.className = 'eat-grid';

    const items = [
      { recipe: { ...sampleRecipe, id: '1', name: 'Chicken Soup' }, inventory: 2 },
      { recipe: { ...sampleRecipe, id: '2', name: 'Veggie Stir-Fry', macros: { protein: 12, carbs: 35, fat: 8, calories: 260 } }, inventory: 7 },
      { recipe: { ...sampleRecipe, id: '3', name: 'Pasta Bake', macros: { protein: 18, carbs: 45, fat: 12, calories: 360 } }, inventory: 15 },
      { recipe: { ...sampleRecipe, id: '4', name: 'Lentil Curry', macros: { protein: 15, carbs: 40, fat: 6, calories: 274 } }, inventory: 1 },
    ];

    items.forEach(({ recipe, inventory }) => {
      grid.appendChild(createCard(recipe, inventory));
    });

    return grid;
  },
};
