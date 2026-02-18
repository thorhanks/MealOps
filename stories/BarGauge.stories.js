import '../components/bar-gauge.js';

export default {
  title: 'Components/BarGauge',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

function createGauge(current, target, label = 'kcal') {
  const gauge = document.createElement('bar-gauge');
  gauge.setAttribute('current', current);
  gauge.setAttribute('target', target);
  gauge.setAttribute('label', label);
  return gauge;
}

export const Empty = {
  render: () => createGauge(0, 2000),
};

export const LowProgress = {
  render: () => createGauge(400, 2000),
};

export const HalfWay = {
  render: () => createGauge(1000, 2000),
};

export const NearTarget = {
  render: () => createGauge(1850, 2000),
};

export const AtTarget = {
  render: () => createGauge(2000, 2000),
};

export const OverTarget = {
  render: () => createGauge(2400, 2000),
};

export const SmallTarget = {
  render: () => createGauge(120, 500),
};
