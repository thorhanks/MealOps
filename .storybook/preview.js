import '../styles/main.css';

/** @type { import('@storybook/web-components').Preview } */
const preview = {
  parameters: {
    backgrounds: {
      default: 'terminal',
      values: [
        { name: 'terminal', value: '#0a0a0a' },
      ],
    },
  },
};

export default preview;
