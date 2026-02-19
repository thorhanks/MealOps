# MealOps Build Plan & Progress

## 5-Phase Build Plan

### Phase 1: Foundation (COMPLETE)
Core infrastructure that everything else depends on.

**Deliverables:**
- `index.html` — App shell with nav (cook | eat | track), three view sections, status line
- `styles/reset.css` — CSS reset
- `styles/main.css` — All CSS: custom properties, layout, component styles, terminal aesthetic
- `utils/db.js` — IndexedDB wrapper (CRUD for recipes, servingsLog, ingredientCache, settings)
- `utils/router.js` — Hash-based router with `:param` support, `hashchange` listener
- `app.js` — Entry point, route wiring, view management
- `favicon.svg` — Amber "M" on black with blinking cursor

**Key patterns established:**
- CSS vars: `--bg: #0a0a0a`, `--text: #ffb000`, `--text-muted: #aa7700`, `--error: #ff3333`, `--success: #00ff00`
- Font: `'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Inconsolata', monospace`
- DB: `mealops` v1, 4 stores (recipes, servingsLog, ingredientCache, settings)
- Router: `addRoute('/path/:param', handler)`, `navigate('/path')`, `start()`

### Phase 2: Cook Section (COMPLETE)
Recipe CRUD, USDA API integration, ingredient management.

**Deliverables:**
- `utils/units.js` — Unit conversion table (g, kg, oz, lb, cup, tbsp, tsp, ml, l, piece)
- `utils/api.js` — USDA FoodData Central client (search, nutrient extraction, scaling, debounce)
- `components/recipe-card.js` — `<recipe-card>` grid card with macros, inventory, quick actions
- `components/recipe-form.js` — `<recipe-form>` create/edit with ingredient rows, USDA search, manual entry
- `components/recipe-view.js` — `<recipe-view>` single recipe detail
- `components/num-input.js` — `<num-input>` custom terminal-style [-] value [+] number input
- Updated `app.js` with Cook routes: `/cook`, `/cook/new`, `/cook/:id`, `/cook/:id/edit`

**Storybook (dev/testing):**
- `.storybook/main.js` + `.storybook/preview.js`
- `stories/RecipeCard.stories.js` — 8 stories with interaction tests
- `stories/RecipeForm.stories.js` — 6 stories with interaction tests
- `stories/RecipeView.stories.js` — 5 stories
- `stories/NumInput.stories.js` — 9 stories with interaction tests

**USDA API key handling:**
- Stored in IndexedDB settings store as `usdaApiKey`
- Prompted at first use (inline prompt in ingredient row results area)
- USDA always optional — manual macro entry always available

### Phase 3: Eat Section (COMPLETE)
Inventory display, consumption logging, stacked card effect.

**Deliverables:**
- `utils/db.js` — Added `getAllInventory()` helper (returns recipes with stock > 0)
- `components/eat-card.js` — `<eat-card>` with stacked effect, inline consumption workflow
- `components/eat-view.js` — `<eat-view>` inventory grid, empty state
- `styles/main.css` — Stacked card CSS (few/some/many), eat layout styles
- `app.js` — `/eat` route wired to `<eat-view>` component
- `stories/EatCard.stories.js` — 7 stories (stock levels, interaction, grid)
- `stories/EatView.stories.js` — 1 story (empty state)

**Data flow:**
- Read inventory from servingsLog (production - consumption per recipe)
- Log consumption as `{ type: 'consumption', recipeId, servings, date }` in servingsLog
- Show per-serving macros on each card
- Update inventory count in real-time after logging
- Inventory validation: prevents consuming more than available

### Phase 4: Track Section (COMPLETE)
Daily macro dashboard, bar gauge, weekly trend, ad-hoc food logging.

**Deliverables:**
- `components/bar-gauge.js` — `<bar-gauge>` horizontal bar with color-coded calorie progress
- `components/weekly-trend.js` — `<weekly-trend>` 7-day (Sun–Sat) ASCII bar chart
- `components/adhoc-food.js` — `<adhoc-food>` structured input with USDA search + manual macros
- `components/track-view.js` — `<track-view>` daily dashboard orchestrator (date nav, log, gauge, trend)
- `styles/main.css` — Track section styles (gauge, trend, log, adhoc form)
- `app.js` — `/track` route wired to `<track-view>` component
- `stories/BarGauge.stories.js` — 7 stories (empty, low, half, near, at, over target, small target)
- `stories/WeeklyTrend.stories.js` — 5 stories (typical, all over, empty, partial, no data)
- `stories/AdhocFood.stories.js` — 2 stories (default, with event logging)
- `stories/TrackView.stories.js` — 1 story (default full dashboard)

**Data flow:**
- Query servingsLog by date range for consumption entries
- Recipe-based entries: look up recipe macros × servings (dynamic, supports retroactive recalc)
- Ad-hoc foods stored as servingsLog entries with `type: 'consumption'`, `recipeId: null`, inline macros
- Weekly trend aggregates daily totals for Sun–Sat of current week
- Delete from log: removes entry, recipe-based deletions auto-restore inventory
- Target calories persisted in settings store

### Phase 5: Polish (COMPLETE)
Command palette, import/export, help view, remaining stories.

**Deliverables:**
- `components/command-palette.js` — `<command-palette>` overlay triggered by Ctrl+K / Cmd+K
- `components/help-view.js` — `<help-view>` static help/shortcuts page
- `utils/data-io.js` — JSON export (all stores) and import (file picker, overwrites duplicates)
- `utils/db.js` — Added `getAllRecipesRaw()`, `getAllLogEntries()`, `getAllCachedIngredients()`, `bulkPut()`
- `app.js` — Wired command palette, `/help` route, palette-search handler, Ctrl+K listener
- `index.html` — Added help view section and `<command-palette>` element
- `styles/main.css` — Command palette overlay and help view styles
- `stories/MacroPie.stories.js` — 7 stories (balanced, protein-heavy, carb-heavy, fat-heavy, empty, large, single)
- `stories/CommandPalette.stories.js` — 5 stories with interaction tests (open, filter, no matches, arrow nav, escape)
- `stories/HelpView.stories.js` — 1 story (default)

**Command palette commands:**
- `cook`, `eat`, `track` — navigate to sections
- `add recipe` — navigate to new recipe form
- `export data` — download JSON backup
- `import data` — file picker, validate, overwrite duplicates
- `search <query>` — filter cook grid by recipe name
- `help`, `shortcuts` — navigate to help page

## Current File Inventory

```
/index.html                    — App shell
/app.js                        — Entry point, routes, view management
/favicon.svg                   — Terminal-style favicon
/package.json                  — Zero prod deps, Storybook dev deps
/styles/reset.css              — CSS reset
/styles/main.css               — All styles
/utils/db.js                   — IndexedDB wrapper
/utils/router.js               — Hash-based router
/utils/api.js                  — USDA API client
/utils/units.js                — Unit conversion table
/components/recipe-card.js     — <recipe-card>
/components/recipe-form.js     — <recipe-form>
/components/recipe-view.js     — <recipe-view>
/components/num-input.js       — <num-input>
/components/eat-card.js        — <eat-card>
/components/eat-view.js        — <eat-view>
/stories/RecipeCard.stories.js — 8 stories
/stories/RecipeForm.stories.js — 6 stories
/stories/RecipeView.stories.js — 5 stories
/stories/NumInput.stories.js   — 9 stories
/stories/EatCard.stories.js    — 7 stories
/stories/EatView.stories.js    — 1 story
/components/bar-gauge.js       — <bar-gauge>
/components/weekly-trend.js    — <weekly-trend>
/components/adhoc-food.js      — <adhoc-food>
/components/track-view.js      — <track-view>
/stories/BarGauge.stories.js   — 7 stories
/stories/WeeklyTrend.stories.js — 5 stories
/stories/AdhocFood.stories.js  — 2 stories
/stories/TrackView.stories.js  — 1 story
/components/command-palette.js  — <command-palette>
/components/help-view.js       — <help-view>
/utils/data-io.js              — Import/export (JSON)
/stories/MacroPie.stories.js   — 7 stories
/stories/CommandPalette.stories.js — 5 stories
/stories/HelpView.stories.js   — 1 story
/.storybook/main.js            — Storybook config
/.storybook/preview.js         — Storybook preview (loads CSS)
/docs/features.md              — Feature specs
/docs/data-model.md            — IndexedDB schema
/docs/design-spec.md           — Visual design spec
/docs/storybook.md             — Storybook guide
```

## Bug Fixes Applied (after Phase 2)

1. **Cook grid not rendering** — `getAllRecipes()` used `getByIndex('deleted', false)` which is unreliable for booleans in IndexedDB. Changed to `getAll().then(filter)`.
2. **Ingredient amount overlap** — Widened recipe form to 120ch, set ingredient row to `flex-wrap: nowrap`, name to `flex: 1 1 12ch`.
3. **NumInput +/- not working** — `stepUp()`/`stepDown()` throw with `step="any"`. Replaced with manual arithmetic.
4. **RecipeForm story error** — `userEvent.clear()` targeted `<num-input>` instead of inner `<input>`.
5. **Shallow copy bug** — `{ ...ing }` didn't deep copy `nutrition` object. Added `nutrition: { ...ing.nutrition }`.
6. **Debounce memory leak** — Previous debounce calls now reject with `AbortError` instead of hanging forever.
7. **Router redirect loop** — Added guard: don't navigate to `/cook` if already at `/cook`.
8. **Unhandled async** — Added `.catch()` to `renderCookGrid()` in route handler.
9. **Double event firing** — Removed redundant inner input listener; `change` proxy from `<num-input>` already handles it.
10. **Duplicate DOM IDs** — API key prompt used `id=` attributes; changed to class-based selectors.

## Environment Notes

- Node v25.6.1 via nvm.fish (fish shell — nvm doesn't support fish natively, uses fisher + nvm.fish)
- Storybook 8.6 with `@storybook/web-components-vite`
- `npm run storybook` → port 6006
- `npm run build-storybook` → storybook-static/
- No prod dependencies; no build step for production (native ES modules)
