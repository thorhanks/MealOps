import '../components/welcome-view.js';

export default {
  title: 'Components/WelcomeView',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export const Default = {
  render: () => document.createElement('welcome-view'),
};
