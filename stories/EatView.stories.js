import '../components/eat-view.js';

export default {
  title: 'Components/EatView',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

// Note: EatView depends on IndexedDB via getAllInventory().
// In Storybook, DB will be empty so it shows the empty state.
export const EmptyState = {
  render: () => {
    const view = document.createElement('eat-view');
    return view;
  },
};
