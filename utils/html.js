const _div = document.createElement('div');

function escHtml(str) {
  _div.textContent = str ?? '';
  return _div.innerHTML;
}

/**
 * Typewriter effect: types text into an element character-by-character.
 * @param {HTMLElement} el - target element (should already be in the DOM)
 * @param {string} text - text to type out
 * @param {number} speed - ms per character (default 20)
 * @returns {Promise} resolves when typing is complete
 */
function typewrite(el, text, speed = 20) {
  el.textContent = '';
  let i = 0;
  return new Promise((resolve) => {
    const tick = () => {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    };
    tick();
  });
}

/**
 * Show a typewritten status message inside a container element.
 * Replaces container contents with a styled span.
 * @param {HTMLElement} container - parent element to show message in
 * @param {string} text - message text
 * @param {'ok'|'error'|'loading'} type - message style
 * @param {number} speed - ms per character
 */
function typeMsg(container, text, type = 'ok', speed = 20) {
  container.innerHTML = '';
  const span = document.createElement('span');
  span.className = `msg-${type}`;
  container.appendChild(span);
  return typewrite(span, text, speed);
}

export { escHtml, typewrite, typeMsg };
