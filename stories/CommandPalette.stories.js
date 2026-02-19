import '../components/command-palette.js';
import { expect, userEvent, within } from '@storybook/test';

export default {
  title: 'Components/CommandPalette',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

function createPalette() {
  const el = document.createElement('command-palette');
  // open immediately for story visibility
  setTimeout(() => el.open(), 0);
  return el;
}

export const Open = {
  render: () => createPalette(),
};

export const TypeAndFilter = {
  render: () => createPalette(),
  play: async ({ canvasElement }) => {
    // wait for palette to open
    await new Promise((r) => setTimeout(r, 100));

    const input = canvasElement.querySelector('.command-palette__input');
    await expect(input).toBeTruthy();

    await userEvent.type(input, 'cook');

    const items = canvasElement.querySelectorAll('.command-palette__item');
    // should filter to "cook" related commands
    await expect(items.length).toBeGreaterThan(0);

    const labels = Array.from(items).map((el) => el.querySelector('.command-palette__item-label').textContent);
    for (const label of labels) {
      await expect(label.toLowerCase()).toContain('cook');
    }
  },
};

export const NoMatchesShowsEmpty = {
  render: () => createPalette(),
  play: async ({ canvasElement }) => {
    await new Promise((r) => setTimeout(r, 100));

    const input = canvasElement.querySelector('.command-palette__input');
    await userEvent.type(input, 'xyznotacommand');

    const empty = canvasElement.querySelector('.command-palette__empty');
    await expect(empty).toBeTruthy();
    await expect(empty.textContent).toContain('no matching');
  },
};

export const ArrowKeyNavigation = {
  render: () => createPalette(),
  play: async ({ canvasElement }) => {
    await new Promise((r) => setTimeout(r, 100));

    const input = canvasElement.querySelector('.command-palette__input');
    await expect(input).toBeTruthy();

    // first item should be selected
    let selected = canvasElement.querySelector('.command-palette__item.selected');
    await expect(selected).toBeTruthy();

    // arrow down moves selection
    await userEvent.keyboard('{ArrowDown}');
    await new Promise((r) => setTimeout(r, 50));

    const items = canvasElement.querySelectorAll('.command-palette__item');
    selected = canvasElement.querySelector('.command-palette__item.selected');
    if (items.length > 1) {
      await expect(selected).toBe(items[1]);
    }
  },
};

export const EscapeCloses = {
  render: () => createPalette(),
  play: async ({ canvasElement }) => {
    await new Promise((r) => setTimeout(r, 100));

    const input = canvasElement.querySelector('.command-palette__input');
    await expect(input).toBeTruthy();

    await userEvent.keyboard('{Escape}');
    await new Promise((r) => setTimeout(r, 50));

    const overlay = canvasElement.querySelector('.command-palette.open');
    await expect(overlay).toBeNull();
  },
};
