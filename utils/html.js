const _div = document.createElement('div');

function escHtml(str) {
  _div.textContent = str ?? '';
  return _div.innerHTML;
}

export { escHtml };
