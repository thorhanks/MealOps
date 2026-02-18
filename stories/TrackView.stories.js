import '../components/track-view.js';

export default {
  title: 'Components/TrackView',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '2ch';
    wrapper.style.maxWidth = '1200px';

    const el = document.createElement('track-view');
    wrapper.appendChild(el);
    return wrapper;
  },
};
