import '../components/macro-pie.js';

export default {
  title: 'Components/MacroPie',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

function createPie(data) {
  const pie = document.createElement('macro-pie');
  pie.data = data;
  return pie;
}

export const Balanced = {
  render: () => createPie({ protein: 40, carbs: 50, fat: 20 }),
};

export const ProteinHeavy = {
  render: () => createPie({ protein: 80, carbs: 20, fat: 10 }),
};

export const CarbHeavy = {
  render: () => createPie({ protein: 15, carbs: 90, fat: 10 }),
};

export const FatHeavy = {
  render: () => createPie({ protein: 10, carbs: 15, fat: 60 }),
};

export const EmptyState = {
  render: () => createPie({ protein: 0, carbs: 0, fat: 0 }),
};

export const LargeValues = {
  render: () => createPie({ protein: 150, carbs: 300, fat: 80 }),
};

export const SingleMacro = {
  render: () => createPie({ protein: 50, carbs: 0, fat: 0 }),
};
