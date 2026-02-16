# MealOps — Storybook Guide

## Overview

Storybook is used exclusively for component development and testing. It runs as a separate dev environment and does not affect the production application.

## Setup

```bash
# Storybook for web components (already configured)
npm run storybook        # start dev server
npm run test-storybook   # run interaction tests
npm run build-storybook  # build static (optional)
```

Storybook files live in `/stories/`.

## Story Structure

### Full Application Story
Create a story for `index.html` showing the complete integrated experience:
- File: `stories/index.stories.js`

### Component Stories
Each web component gets a `.stories.js` file demonstrating:
- Default state
- Multiple variants/states
- Edge cases (empty data, max values, error states)

**Example:**
```javascript
// stories/RecipeCard.stories.js
export default {
  title: 'Components/RecipeCard',
  tags: ['autodocs'],
};

export const Default = {
  render: () => {
    const card = document.createElement('recipe-card');
    card.setAttribute('recipe-name', 'Chicken Soup');
    card.setAttribute('servings', '8');
    return card;
  },
};

export const LowInventory = {
  render: () => {
    const card = document.createElement('recipe-card');
    card.setAttribute('recipe-name', 'Veggie Stir-Fry');
    card.setAttribute('servings', '2');
    return card;
  },
};
```

### Expected Component Stories
- `stories/RecipeCard.stories.js`
- `stories/InventoryCard.stories.js`
- `stories/CalorieGauge.stories.js`
- `stories/WeeklyTrend.stories.js`
- `stories/CommandPalette.stories.js`
- `stories/ConsumptionLog.stories.js`

## Interaction Testing

Use `@storybook/test` for interaction tests on every component.

**Test coverage for each component:**
- Button clicks and form submissions
- Input changes and validation
- Keyboard navigation (Tab, Enter, Escape, arrows)
- State changes and event dispatching
- Edge cases (empty states, max values, invalid inputs)
- Terminal-style interactions

**Example:**
```javascript
import { expect, userEvent, within } from '@storybook/test';

export const ClickToView = {
  render: () => {
    const card = document.createElement('recipe-card');
    card.setAttribute('recipe-name', 'Pasta Bake');
    return card;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viewButton = canvas.getByText('view');

    await userEvent.click(viewButton);

    await expect(card.classList.contains('expanded')).toBe(true);
  },
};
```

## Guidelines

- Develop components in isolation before integrating
- Test all keyboard accessibility
- Test error and empty states
- Storybook dependencies are dev-only — never imported by production code
- Keep stories up to date as components evolve
