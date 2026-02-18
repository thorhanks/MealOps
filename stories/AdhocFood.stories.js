import '../components/adhoc-food.js';

export default {
  title: 'Components/AdhocFood',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export const Default = {
  render: () => {
    const el = document.createElement('adhoc-food');
    el.date = Date.now();
    return el;
  },
};

export const WithEventLogging = {
  render: () => {
    const wrapper = document.createElement('div');
    const el = document.createElement('adhoc-food');
    el.date = Date.now();

    const output = document.createElement('pre');
    output.style.color = 'var(--success)';
    output.style.marginTop = '2ch';
    output.textContent = '> waiting for adhoc-logged event...';

    el.addEventListener('adhoc-logged', (e) => {
      output.textContent = '> adhoc-logged event:\n' + JSON.stringify(e.detail, null, 2);
    });

    wrapper.appendChild(el);
    wrapper.appendChild(output);
    return wrapper;
  },
};
