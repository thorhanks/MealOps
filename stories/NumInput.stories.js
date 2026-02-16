import { expect, userEvent, within } from '@storybook/test';
import '../components/num-input.js';

export default {
  title: 'Components/NumInput',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export const Default = {
  render: () => {
    const el = document.createElement('num-input');
    el.setAttribute('value', '4');
    el.setAttribute('min', '0');
    return el;
  },
};

export const WithStep = {
  render: () => {
    const el = document.createElement('num-input');
    el.setAttribute('value', '100');
    el.setAttribute('min', '0');
    el.setAttribute('step', '10');
    return el;
  },
};

export const CustomWidth = {
  render: () => {
    const el = document.createElement('num-input');
    el.setAttribute('value', '2000');
    el.setAttribute('width', '10ch');
    return el;
  },
};

export const MinBound = {
  render: () => {
    const el = document.createElement('num-input');
    el.setAttribute('value', '1');
    el.setAttribute('min', '1');
    return el;
  },
};

export const Fractional = {
  render: () => {
    const el = document.createElement('num-input');
    el.setAttribute('value', '1.5');
    el.setAttribute('step', 'any');
    el.setAttribute('min', '0');
    return el;
  },
};

export const InlineWithText = {
  render: () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <span class="prompt">servings made:</span>
      <num-input min="1" value="1" width="6ch"></num-input>
      <button class="btn">[ok]</button>
    `;
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '1ch';
    return container;
  },
};

export const ClickIncrement = {
  render: () => {
    const el = document.createElement('num-input');
    el.setAttribute('value', '5');
    el.setAttribute('min', '0');
    return el;
  },
  play: async ({ canvasElement }) => {
    const plusBtn = canvasElement.querySelector('[data-dir="+"]');
    const input = canvasElement.querySelector('input');

    await expect(input.value).toBe('5');

    await userEvent.click(plusBtn);
    await expect(input.value).toBe('6');

    await userEvent.click(plusBtn);
    await expect(input.value).toBe('7');
  },
};

export const ClickDecrement = {
  render: () => {
    const el = document.createElement('num-input');
    el.setAttribute('value', '3');
    el.setAttribute('min', '0');
    return el;
  },
  play: async ({ canvasElement }) => {
    const minusBtn = canvasElement.querySelector('[data-dir="-"]');
    const input = canvasElement.querySelector('input');

    await expect(input.value).toBe('3');

    await userEvent.click(minusBtn);
    await expect(input.value).toBe('2');

    await userEvent.click(minusBtn);
    await expect(input.value).toBe('1');

    await userEvent.click(minusBtn);
    await expect(input.value).toBe('0');

    // Should not go below min
    await userEvent.click(minusBtn);
    await expect(input.value).toBe('0');
  },
};

export const DirectTyping = {
  render: () => {
    const el = document.createElement('num-input');
    el.setAttribute('value', '0');
    el.setAttribute('min', '0');
    return el;
  },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('input');

    await userEvent.clear(input);
    await userEvent.type(input, '42');
    await expect(input.value).toBe('42');
  },
};
