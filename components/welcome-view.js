import { typewrite } from '../utils/html.js';

class WelcomeView extends HTMLElement {
  connectedCallback() {
    this.render();
    const tagline = this.querySelector('.welcome-view__tagline');
    if (tagline) typewrite(tagline, '> souper cube meal ops terminal', 40);
  }

  render() {
    this.innerHTML = `
      <div class="welcome-view">
        <img class="welcome-view__logo" src="logo.png" alt="MEALOPS" />

        <p class="welcome-view__tagline"></p>

        <div class="welcome-view__desc">
          <p>local-only meal prep management system.</p>
          <p>create recipes, track inventory, monitor daily macros.</p>
          <p>all data stored in IndexedDB — no backend, no tracking, no cloud.</p>
        </div>

        <div class="welcome-view__nav">
          <span class="welcome-view__prompt">select module:</span>
          <div class="welcome-view__nav-grid">
            <a href="#/cook" class="btn welcome-view__link">[cook]</a>  <span>create and manage recipes</span>
            <a href="#/eat" class="btn welcome-view__link">[eat]</a>    <span>view inventory, log consumption</span>
            <a href="#/track" class="btn welcome-view__link">[track]</a> <span>daily macros and trends</span>
          </div>
        </div>

        <div class="welcome-view__hint">
          <span>tip: press Ctrl+K to open command palette</span>
        </div>
      </div>
    `;
  }
}

customElements.define('welcome-view', WelcomeView);
export default WelcomeView;
