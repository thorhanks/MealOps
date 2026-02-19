class HelpView extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="help-view">
        <h1>> help</h1>

        <div class="help-view__section">
          <h2>about</h2>
          <p>MealOps is a local-only meal prep tracker. Manage souper cube recipes,
          track inventory, and monitor daily macros. All data stored in your browser.</p>
        </div>

        <div class="help-view__section">
          <h2>data flow</h2>
          <div class="help-view__flow">
            <span class="help-view__flow-arrow">COOK</span> create recipes, log production
            <br><span class="help-view__flow-arrow">&nbsp; |</span>
            <br><span class="help-view__flow-arrow">&nbsp; v</span>
            <br><span class="help-view__flow-arrow">EAT</span>&nbsp; view inventory, log consumption
            <br><span class="help-view__flow-arrow">&nbsp; |</span>
            <br><span class="help-view__flow-arrow">&nbsp; v</span>
            <br><span class="help-view__flow-arrow">TRACK</span> daily macros, trends, ad-hoc food
          </div>
        </div>

        <div class="help-view__section">
          <h2>keyboard shortcuts</h2>
          <table class="help-view__table">
            <thead>
              <tr><th>key</th><th>action</th></tr>
            </thead>
            <tbody>
              <tr><td>Ctrl+K / Cmd+K</td><td>open command palette</td></tr>
              <tr><td>Escape</td><td>close command palette</td></tr>
              <tr><td>Arrow Up/Down</td><td>navigate palette results</td></tr>
              <tr><td>Enter</td><td>execute selected command</td></tr>
            </tbody>
          </table>
        </div>

        <div class="help-view__section">
          <h2>command palette</h2>
          <p>Press <strong>Ctrl+K</strong> to open. Available commands:</p>
          <table class="help-view__table">
            <thead>
              <tr><th>command</th><th>action</th></tr>
            </thead>
            <tbody>
              <tr><td>cook</td><td>go to recipes</td></tr>
              <tr><td>eat</td><td>go to inventory</td></tr>
              <tr><td>track</td><td>go to daily tracker</td></tr>
              <tr><td>add recipe</td><td>create a new recipe</td></tr>
              <tr><td>export data</td><td>download all data as JSON</td></tr>
              <tr><td>import data</td><td>restore data from JSON file</td></tr>
              <tr><td>search &lt;query&gt;</td><td>search recipes by name</td></tr>
              <tr><td>help</td><td>this page</td></tr>
              <tr><td>shortcuts</td><td>this page</td></tr>
            </tbody>
          </table>
        </div>

        <div class="help-view__section">
          <h2>import / export</h2>
          <p>Export creates a JSON backup of all your data: recipes, inventory log,
          ingredient cache, and settings. Import overwrites existing records with
          matching IDs.</p>
        </div>

        <div class="help-view__section" style="color: var(--text-muted); font-size: var(--font-size-sm);">
          MEALOPS v1.0.0 — local-only, no backend, no tracking
        </div>
      </div>
    `;
  }
}

customElements.define('help-view', HelpView);
export default HelpView;
