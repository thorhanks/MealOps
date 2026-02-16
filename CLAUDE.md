# MealOps — Project Guidelines

## What Is This
MealOps is a single-page web app for managing souper cube recipes, inventory, and daily macro tracking. Local-only, single-user, no backend. Data stored in IndexedDB.

## Detailed Docs
Read these before implementing features — they contain schemas, workflows, UI specs, and examples:
- `docs/features.md` — Cook, Eat, Track section specs, workflows, USDA API details
- `docs/data-model.md` — IndexedDB schema, object stores, data operations, cascade rules
- `docs/design-spec.md` — Visual design, color palette, CSS patterns, UI element specs
- `docs/storybook.md` — Storybook setup, story structure, interaction testing

## Tech Stack — Hard Rules

### Use
- Vanilla JavaScript (ES6+), no TypeScript
- Native Web Components (Custom Elements, Shadow DOM, Templates)
- ES modules with explicit `.js` extensions in imports
- Plain CSS with custom properties
- Native browser APIs (Fetch, IndexedDB, etc.)
- Storybook for dev/testing only (does not affect production)

### Do Not Use
- Frameworks: React, Vue, Angular, Svelte, jQuery
- Build tools: Webpack, Vite, Rollup, Parcel, Babel, esbuild
- TypeScript
- UI libraries: Material, Bootstrap, Tailwind
- CSS preprocessors or CSS-in-JS
- Heavy NPM dependencies (minimize to near-zero)
- Animation libraries

### External API
- USDA FoodData Central: `https://api.nal.usda.gov/fdc/v1/`
- **Requires free API key** (not "no key required")
- Nutrient IDs: protein=1003, fat=1004, carbs=1005, calories=1008
- Cache responses in IndexedDB
- USDA lookup is always optional — manual macro entry is always available

## Architecture

### File Organization
```
/components/  — web component .js files (one per component)
/styles/      — CSS files
/utils/       — utility functions (db.js, router.js, api.js, etc.)
/stories/     — Storybook stories
/docs/        — detailed specifications
/app.js       — main entry point
/index.html   — single HTML file
```

### Routing
Hash-based: `#/cook`, `#/eat`, `#/track`, `#/cook/:id`, `#/cook/:id/edit`

### Components
- One `.js` file per component, filename matches tag name (e.g., `recipe-card.js` → `<recipe-card>`)
- Kebab-case for custom element names
- Shadow DOM for encapsulation where appropriate

## Design Rules

### Aesthetic: Terminal/Hacker UI
- Monospaced fonts everywhere: `'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', monospace`
- Background: near-black (`#0a0a0a`), text: amber (`#ffb000`)
- No rounded corners, no shadows, no gradients
- Hard-edged flat rectangles only
- Text-based controls: `[action]`, `> prompt`
- ASCII characters for icons: `>`, `+`, `-`, `x`, `*`, `|`
- Inline feedback, no modals/toasts/alerts
- Keyboard-first navigation
- Desktop-first (1024px+), mobile functional but not optimized

### Feedback Format
```
OK: recipe saved [id:abc123]
ERROR: failed to save — quota exceeded
```

## Key Design Decisions
- **USDA API offline**: Show error, allow manual macro entry. Never block on network.
- **Unit conversion**: Built-in table for common units (g, oz, cup, tbsp, tsp, lb, ml). See `docs/features.md`.
- **Recipe deletion**: Soft delete (set `deleted: true`). Log entries preserved.
- **Recipe editing**: Servings change triggers retroactive macro recalculation.
- **Inventory validation**: Prevent consumption that would exceed available inventory. No negative inventory.
- **Ad-hoc food input**: Structured fields (name, amount, unit), not free-text parsing.
- **Week start**: Sunday (Sun–Sat for weekly trends).
- **ID generation**: `crypto.randomUUID()`

## Code Style
- `const`/`let`, never `var`
- Async/await for async operations
- Small, focused functions
- Self-documenting code; comments only where non-obvious
- Console logging with prefixes: `[Router]`, `[DB]`, `[API]`
- No unnecessary abstractions — keep it simple
