import '../components/weekly-trend.js';

export default {
  title: 'Components/WeeklyTrend',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

function createTrend(data, weekLabel = 'week of 2024-01-14') {
  const trend = document.createElement('weekly-trend');
  trend.weekLabel = weekLabel;
  trend.data = data;
  return trend;
}

const target = 2000;

export const TypicalWeek = {
  render: () => createTrend([
    { day: 0, calories: 2100, target, isSelected: false },
    { day: 1, calories: 1600, target, isSelected: false },
    { day: 2, calories: 1850, target, isSelected: true },
    { day: 3, calories: 2000, target, isSelected: false },
    { day: 4, calories: 950, target, isSelected: false },
    { day: 5, calories: 2050, target, isSelected: false },
    { day: 6, calories: 1800, target, isSelected: false },
  ]),
};

export const AllOverTarget = {
  render: () => createTrend([
    { day: 0, calories: 2500, target, isSelected: false },
    { day: 1, calories: 2200, target, isSelected: false },
    { day: 2, calories: 2800, target, isSelected: false },
    { day: 3, calories: 2100, target, isSelected: true },
    { day: 4, calories: 2300, target, isSelected: false },
    { day: 5, calories: 2600, target, isSelected: false },
    { day: 6, calories: 2400, target, isSelected: false },
  ]),
};

export const EmptyWeek = {
  render: () => createTrend([
    { day: 0, calories: 0, target, isSelected: false },
    { day: 1, calories: 0, target, isSelected: false },
    { day: 2, calories: 0, target, isSelected: true },
    { day: 3, calories: 0, target, isSelected: false },
    { day: 4, calories: 0, target, isSelected: false },
    { day: 5, calories: 0, target, isSelected: false },
    { day: 6, calories: 0, target, isSelected: false },
  ]),
};

export const PartialWeek = {
  render: () => createTrend([
    { day: 0, calories: 1800, target, isSelected: false },
    { day: 1, calories: 2100, target, isSelected: false },
    { day: 2, calories: 1500, target, isSelected: true },
    { day: 3, calories: 0, target, isSelected: false },
    { day: 4, calories: 0, target, isSelected: false },
    { day: 5, calories: 0, target, isSelected: false },
    { day: 6, calories: 0, target, isSelected: false },
  ]),
};

export const NoData = {
  render: () => createTrend(null),
};
