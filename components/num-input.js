class NumInput extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const min = this.getAttribute('min') ?? '';
    const max = this.getAttribute('max') ?? '';
    const step = this.getAttribute('step') ?? '1';
    const value = this.getAttribute('value') ?? '';
    const placeholder = this.getAttribute('placeholder') ?? '';
    const width = this.getAttribute('width') ?? '8ch';

    this.innerHTML = `
      <span class="num-input">
        <button class="num-input__btn" data-dir="-" tabindex="-1" aria-label="Decrease value">-</button>
        <input type="number" class="input num-input__field"
          min="${min}" max="${max}" step="${step}"
          value="${value}" placeholder="${placeholder}"
          style="width: ${width}; text-align: center;">
        <button class="num-input__btn" data-dir="+" tabindex="-1" aria-label="Increase value">+</button>
      </span>
    `;

    const input = this.querySelector('input');
    const btnMinus = this.querySelector('[data-dir="-"]');
    const btnPlus = this.querySelector('[data-dir="+"]');

    // Determine the actual step increment (step="any" means use 1)
    const stepVal = (step === 'any' || step === '') ? 1 : parseFloat(step) || 1;
    const minVal = min !== '' ? parseFloat(min) : -Infinity;
    const maxVal = max !== '' ? parseFloat(max) : Infinity;

    btnMinus.addEventListener('click', () => {
      const current = parseFloat(input.value) || 0;
      const next = Math.max(minVal, current - stepVal);
      input.value = next;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    btnPlus.addEventListener('click', () => {
      const current = parseFloat(input.value) || 0;
      const next = Math.min(maxVal, current + stepVal);
      input.value = next;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Proxy events
    input.addEventListener('input', () => {
      this.setAttribute('value', input.value);
      this.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  get value() {
    const input = this.querySelector('input');
    return input ? input.value : this.getAttribute('value');
  }

  set value(v) {
    const input = this.querySelector('input');
    if (input) input.value = v;
    this.setAttribute('value', v);
  }

  focus() {
    const input = this.querySelector('input');
    if (input) input.focus();
  }

  select() {
    const input = this.querySelector('input');
    if (input) input.select();
  }
}

customElements.define('num-input', NumInput);

export default NumInput;
