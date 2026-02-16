# MealOps - Project Guidelines

## Project Overview
MealOps is a web app for managing souper cube recipes, inventory, and macro tracking. The design philosophy is raw, technical, utilitarian, and hacker-oriented with a performance-first mindset.

## Application Architecture

### Core Structure
- **Type**: Single-page application (SPA)
- **Navigation**: Hash-based routing (e.g., `#/cook`, `#/eat`, `#/track`)
- **Data Storage**: IndexedDB for local data persistence
- **User Model**: Single-user local application (no authentication, no backend)
- **Data Scope**: All data stored locally on the user's device

### Application Sections

The application has three primary sections:

#### 1. Cook (Recipes)
- Grid card display of souper cube recipes
- Create, edit, view, and delete recipes
- Hash route: `#/cook`

**Recipe Creation Workflow:**
1. User enters:
   - Recipe name
   - Ingredients (name, amount, unit)
   - Preparation instructions
   - Number of servings
2. App automatically:
   - Calls USDA FoodData Central API to fetch nutritional data for each ingredient
   - Calculates total macros for the entire recipe
   - Divides by number of servings to get per-serving macros
   - Stores calculated macros with the recipe

**Recipe Display:**
- Each recipe card shows:
  - Recipe name
  - Macros per serving (protein, carbs, fat, calories)
  - Current inventory count (servings available)
  - Quick actions (view, edit, delete, mark as made)

**Adding to Inventory:**
- User can click a button on any recipe card to indicate they've made that recipe
- Prompts for number of servings made
- Adds those servings to the inventory (displayed in Eat section)
- Creates a "production" log entry with timestamp

#### 2. Eat (Inventory & Consumption)
- Display current inventory of all available servings
- Shows recipes with servings in stock
- Log consumption when servings are eaten
- Track inventory changes over time
- Hash route: `#/eat`

**Visual Design - Stacked Cards:**
- Grid layout displaying each recipe that has servings in inventory
- Each recipe card appears as a "stack of cards" to visually represent inventory quantity
- Stack depth represents approximate inventory level:
  - **0 servings**: Card appears flat/faded or is hidden
  - **1-3 servings** (few): Thin stack (slight shadow/offset)
  - **4-10 servings** (some): Medium stack (moderate layering)
  - **11+ servings** (many): Thick stack (prominent layering effect)
- Stack effect achieved with CSS (box-shadows, pseudo-elements, or layered borders)
- Not a 1-to-1 representation, just a visual approximation of stock levels
- Maintains flat, hard-edged terminal aesthetic (no soft shadows)

**Card Display:**
- Each card shows:
  - Recipe name
  - Exact inventory count (e.g., "7 servings")
  - Macros per serving
  - Quick action to log consumption

**Consumption Workflow:**
1. User clicks/selects a recipe card from the grid
2. Prompted to enter number of servings consumed
3. App validates against available inventory
4. Logs consumption with timestamp
5. Decrements inventory count
6. Updates card visual (stack depth changes)
7. Consumption data feeds into Track section for macro tracking

**Empty State:**
- If no recipes have inventory, show terminal-style message:
  ```
  > no servings in inventory
  > make recipes in [cook] section to add to inventory
  ```

#### 3. Track (Dashboard)
- Daily nutritional tracking dashboard
- Set and track against daily calorie target
- View consumption log for any date
- Visualize daily progress and weekly trends
- Hash route: `#/track`

**Target Calorie Setting:**
- User can enter a daily calorie target (max)
- Editable at any time
- Persisted in IndexedDB (user settings)
- Used for progress bar and trend comparisons
- Example: "Target: 2000 kcal/day"

**Date Selection:**
- Date picker/selector to view any day's data
- Defaults to current day on load
- All displayed data updates when date changes
- Terminal-style date display: `[2024-01-15]` or `> showing: 2024-01-15`

**Ad-hoc Food Logging:**
- User can log food items that aren't part of any recipe
- Terminal-style input: `> log food: 1 apple` or `> ate 200g chicken breast`
- App searches USDA API for nutritional data
- User selects correct food item from results
- Calculates macros based on amount/unit entered
- Adds entry to the day's food log
- No inventory tracking for ad-hoc foods

**Daily Consumption Log:**
- List of ALL food consumed on the selected date
- Includes both:
  - Recipe servings (from Eat section)
  - Ad-hoc food items (logged directly in Track)
- Each entry shows:
  - Time consumed
  - Food/recipe name
  - Amount (servings for recipes, quantity for ad-hoc)
  - Macros for that consumption (protein, carbs, fat, calories)
  - Delete button/action
- Terminal-style output format:
  ```
  > consumption log [2024-01-15]
  08:30  chicken soup      2 servings    [p:40g c:30g f:10g cal:380]  [x delete]
  10:15  apple             1 medium      [p:0g  c:25g f:0g  cal:95]   [x delete]
  12:45  veggie stir-fry   1 serving     [p:15g c:45g f:8g  cal:300]  [x delete]
  15:00  protein shake     1 serving     [p:30g c:5g  f:2g  cal:150]  [x delete]
  18:00  pasta bake        1.5 servings  [p:25g c:60g f:15g cal:480]  [x delete]
  ```

**Delete Functionality:**
- User can delete any food log entry
- Confirms deletion with terminal prompt: `> delete entry? [y/n]`
- Removes entry from log
- If entry is from a recipe (Eat section), restores inventory count
- Recalculates all macro totals
- Updates bar gauge and weekly trend

**Macro Summary - Bar Gauge:**
- Vertical bar gauge showing calorie consumption vs target
- Bottom of bar = 0 calories
- Top of bar = target max calories
- Bar fills based on consumption
- Color coding:
  - Below target: amber/green
  - At/near target (90-100%): bright amber
  - Over target (>100%): red
- Display actual values:
  ```
  [████████████░░░] 1160 / 2000 kcal (58%)
  ```
- Also show breakdown of macros consumed:
  - Protein: XXg
  - Carbs: XXg
  - Fat: XXg

**Weekly Trend Chart:**
- Shows 7-day week (Sunday through Saturday)
- Displays calories consumed each day vs target max
- Simple bar chart or ASCII-style visualization
- Visual comparison across the week
- Example format:
  ```
  > weekly trend [week of 2024-01-14]

  Sun  [████████████████] 2100  (105% of target)
  Mon  [████████████░░░░] 1600  (80%)
  Tue  [██████████████░░] 1850  (93%)
  Wed  [████████████████] 2000  (100%)
  Thu  [███████░░░░░░░░░] 950   (48%)
  Fri  [████████████████] 2050  (103%)
  Sat  [██████████████░░] 1800  (90%)
  ```
- Days over target shown in red, under in green/amber
- Current selected day highlighted

**Macro Calculation:**
- Pulls consumption data from Servings Log (type='consumption') for selected date
- For each consumption entry:
  - **If recipe-based** (recipeId exists):
    - Get recipe macros per serving
    - Multiply by number of servings consumed
  - **If ad-hoc food** (recipeId is null):
    - Use macros stored directly in the entry
  - Add to running totals
- Calculate totals:
  - Total protein (g)
  - Total carbs (g)
  - Total fat (g)
  - Total calories (kcal)
- Compare calories against daily target

### Application Workflow

The three sections work together in a complete meal tracking system:

```
1. COOK (Recipe Management)
   ↓
   User creates recipe → API fetches nutrition data → Recipe saved
   ↓
   User clicks "Made This" → Adds servings to inventory
   ↓

2. EAT (Inventory & Consumption)
   ↓
   Display current inventory of available servings
   ↓
   User logs consumption → Decrements inventory
   ↓

3. TRACK (Nutrition Dashboard)
   ↓
   Pulls consumption logs → Calculates macros → Displays trends
```

**Data Flow:**
- **Cook → Eat**: Production entries add servings to inventory
- **Eat → Track**: Recipe consumption entries provide data for macro tracking
- **Track → Eat**: Deleting recipe consumption restores inventory count
- **Track**: Can also log ad-hoc foods directly (bypasses Eat/inventory)
- **Cook → Track**: Recipe macros define nutritional values for tracking

### Data Model

#### Recipes
```javascript
{
  id: string,           // unique identifier
  name: string,         // recipe name
  ingredients: [        // array of ingredients
    {
      name: string,
      amount: number,
      unit: string,
      nutrition: {      // nutritional data from USDA API
        protein: number,
        carbs: number,
        fat: number,
        calories: number
      }
    }
  ],
  instructions: string, // preparation steps
  servings: number,     // number of servings this recipe makes
  macros: {            // calculated per serving (sum of ingredients / servings)
    protein: number,   // grams
    carbs: number,     // grams
    fat: number,       // grams
    calories: number   // kcal
  },
  created: timestamp,
  updated: timestamp
}
```

#### Servings Log
```javascript
{
  id: string,           // unique identifier
  recipeId: string|null, // reference to recipe (null for ad-hoc foods)
  type: string,         // 'production' (made) or 'consumption' (eaten)

  // For recipe-based entries:
  servings: number,     // number of servings (for recipes)

  // For ad-hoc food entries (when recipeId is null):
  foodName: string,     // name of the food item
  amount: number,       // quantity consumed
  unit: string,         // unit (e.g., "pieces", "grams", "cups", "medium")
  macros: {            // nutritional data from USDA API
    protein: number,
    carbs: number,
    fat: number,
    calories: number
  },

  date: timestamp,      // when it was made/eaten
  created: timestamp
}
```

**Entry Types:**
- **Production** (type='production', recipeId=required): Recipe made and added to inventory
- **Recipe Consumption** (type='consumption', recipeId=required): Recipe serving consumed from inventory
- **Ad-hoc Food** (type='consumption', recipeId=null): Food item logged directly without recipe

**Inventory Calculation:**
- Current inventory for a recipe = sum of all servings where type='production' minus sum where type='consumption' (filtered by recipeId)
- Example:
  - Made 10 servings (type='production', servings=10)
  - Ate 3 servings (type='consumption', servings=3)
  - Current inventory = 10 - 3 = 7 servings available
- Ad-hoc foods (recipeId=null) don't affect inventory

#### Ingredient Nutrition Cache
```javascript
{
  id: string,          // unique identifier (e.g., USDA FDC ID)
  name: string,        // ingredient name
  nutrition: {         // per 100g (standardized)
    protein: number,
    carbs: number,
    fat: number,
    calories: number
  },
  source: string,      // 'usda-api' or 'manual'
  cached: timestamp,   // when it was cached
  usdaId: string       // USDA FoodData Central ID (if from API)
}
```

#### User Settings
```javascript
{
  id: 'user-settings', // fixed identifier (single settings object)
  targetCalories: number, // daily calorie target/max
  created: timestamp,
  updated: timestamp
}
```

### Technical Architecture
- Single `index.html` file as entry point
- Hash router handles navigation between sections
- Web Components for all UI elements (recipe cards, forms, dashboard widgets, etc.)
- IndexedDB wrapper/utility for data operations
- Event-driven communication between components
- No page reloads — all navigation and updates happen client-side

### Nutritional Calculation Workflow

When a user creates or edits a recipe:

1. **Ingredient Entry**: User adds ingredients with amount and unit (e.g., "200g chicken breast", "1 cup rice")

2. **API Lookup**: For each ingredient:
   - Search USDA FoodData Central API by ingredient name
   - Present user with matching food items (if multiple results)
   - User selects the correct food item
   - Fetch full nutritional data for that item

3. **Calculation**:
   - Convert user's amount/unit to the API's serving size (usually 100g)
   - Calculate total macros for the specified amount
   - Sum all ingredient macros to get recipe total
   - Divide by number of servings to get per-serving macros

4. **Storage**: Save both:
   - Individual ingredient nutrition data (for future editing)
   - Calculated per-serving macros (for display and tracking)

5. **Caching**: Store API responses in IndexedDB to avoid repeated lookups for common ingredients

**Manual Override:**
- Allow users to manually enter or adjust nutritional values
- Useful when API data is missing or inaccurate
- Mark manually-entered data to distinguish from API data

### Ad-hoc Food Logging Workflow

When a user logs food directly in the Track section (not from a recipe):

1. **Food Entry**: User enters food item and amount (e.g., "1 apple", "200g chicken breast", "2 cups rice")

2. **API Lookup**:
   - Parse input to extract food name and quantity
   - Search USDA FoodData Central API by food name
   - Present user with matching food items
   - User selects the correct food item

3. **Calculation**:
   - Convert user's amount/unit to API's serving size (usually 100g)
   - Calculate macros for the specified amount
   - Store macros directly in the log entry

4. **Storage**: Save as consumption entry with:
   - recipeId = null
   - foodName, amount, unit
   - Calculated macros
   - Current timestamp

5. **Caching**: Store API response in Ingredient Nutrition Cache for future lookups

**Important Notes:**
- Ad-hoc foods don't affect inventory (no production/consumption tracking)
- Deleted from Track section only, doesn't impact Eat section
- Use same USDA API and caching as recipe ingredients

### Additional Features

#### Data Import/Export
- **Export**: Allow users to export all data (recipes and servings log) as a JSON file
  - Triggered via command palette or button: `> export data`
  - Downloads `mealops-data-[timestamp].json` file
  - Include all recipes and servings with full data
- **Import**: Allow users to import data from a JSON file
  - Triggered via command palette: `> import data`
  - Validates JSON structure before importing
  - Show confirmation and summary of imported data
  - Handle merge conflicts (e.g., duplicate recipe IDs)

#### Command Palette
- Global command palette overlay (triggered by `Ctrl+K`, `Cmd+K`, or `/` key)
- Terminal-style interface with autocomplete
- Available commands:
  - Navigation: `cook`, `eat`, `track`
  - Actions: `add recipe`, `log serving`, `export data`, `import data`
  - Filtering: `search [query]`
  - Help: `help`, `shortcuts`
- Fuzzy search/matching for command suggestions
- Escape key to close

#### Responsive Design
- **Desktop-first approach**: Optimize for desktop/laptop screens (1024px+)
- Terminal applications are traditionally desktop experiences
- Mobile devices: functional but not heavily optimized
- Use CSS Grid or Flexbox for layouts that naturally adapt
- Minimum supported viewport: ~768px width recommended, but focus on desktop

## Design Philosophy

### Core Aesthetic: Terminal/Hacker UI
The entire application embraces a command-line, developer-tools aesthetic. Think of it as a web-based terminal interface for meal management rather than a traditional consumer web app.

**Key Principles:**
- Raw, technical, utilitarian
- Hacker-oriented
- Performance-first
- No visual "polish" or modern UI trends
- Function over form

## Visual Design Specifications

### Typography
- **Monospaced typography everywhere** — no sans-serif UI fonts
- Use fonts like: `JetBrains Mono`, `Fira Code`, `IBM Plex Mono`, `Inconsolata`, or system `monospace`
- All text — headings, body, buttons, inputs, labels — uses monospaced fonts

### Color Palette
- **Background**: Near-black (`#000000`, `#0a0a0a`, `#111111`)
- **Primary text**: Amber (`#ffb000`, `#ffa500`) — vintage CRT terminal aesthetic
- **Muted/inactive text**: Dimmed amber (`#cc8800`, `#aa7700`)
- **Error states**: Red terminal color (`#ff0000`, `#ff3333`)
- **Success/active states**: Bright green (`#00ff00`, `#33ff33`)
- **Accent color**: Can use bright amber (`#ffcc00`) for highlights
- Use color sparingly for emphasis, status, or hierarchy

### Layout & Spacing
- **Minimal or no rounded corners** — sharp, hard edges (`border-radius: 0`)
- **No shadows or depth effects** — flat rendering only
- **Flat layout with hard edges** — boxes are simple rectangles
- **Grid or character-based spacing** — use consistent character-width units (e.g., `1ch`, `2ch`) instead of arbitrary pixel values
- No "soft" padding — spacing should feel precise and grid-aligned

### UI Elements

#### Buttons & Controls
- **Reduced chrome** — few visible buttons
- **Text-based controls** preferred over graphical buttons
- Buttons can be: `[action]`, `> action`, or just underlined/highlighted text
- No gradients, no 3D effects, no hover shadows
- Hover states: color change, underline, or bracket highlight

#### Interactions
- **Command-prompt metaphors:**
  - Use `>` for prompts or actions
  - Blinking cursor in inputs
  - Input-style interactions (type to search, type to filter, type commands)
- **Command Palette**: Global command palette (triggered via `Ctrl+K` or `/`) for quick navigation and actions
  - Type to search/filter commands
  - Terminal-style autocomplete
  - Examples: `> cook`, `> add recipe`, `> export data`, `> track today`
- Keyboard-first navigation throughout the app
- All actions should be accessible via keyboard

#### Feedback & Messaging
- **Status feedback shown as inline output** rather than popups or modals
- Display messages below inputs or in a status line
- Use terminal-style output:
  ```
  > add recipe "chicken soup"
  OK: recipe added [id:1234]
  ```
- Errors shown inline with `ERROR:` prefix
- Loading states: simple spinner (`[...]`, `[/]`, `[-]`, `[\]`) or text ("loading...")

#### Special UI Patterns

**Stacked Card Effect (for Eat section inventory):**
- Visual representation of quantity using stacked/layered appearance
- Achieve with CSS techniques while maintaining flat, terminal aesthetic:
  - Multiple `box-shadow` layers with hard edges (no blur)
  - Pseudo-elements (`::before`, `::after`) positioned as layers
  - Border offsets to create stacked appearance
- Example approaches:
  ```css
  /* Few servings - subtle stack */
  .inventory-card[data-stock="few"] {
    box-shadow:
      2px 2px 0 0 rgba(255, 176, 0, 0.3),
      4px 4px 0 0 rgba(255, 176, 0, 0.2);
  }

  /* Many servings - prominent stack */
  .inventory-card[data-stock="many"] {
    box-shadow:
      2px 2px 0 0 rgba(255, 176, 0, 0.5),
      4px 4px 0 0 rgba(255, 176, 0, 0.4),
      6px 6px 0 0 rgba(255, 176, 0, 0.3),
      8px 8px 0 0 rgba(255, 176, 0, 0.2);
  }
  ```
- Keep shadows hard-edged (no blur radius) to maintain terminal aesthetic
- Use amber color with varying opacity for layers

**Vertical Bar Gauge (for Track section calorie progress):**
- Visual progress indicator showing consumption vs target
- Vertical bar with character-based or block-based fill
- Terminal-style ASCII representation or CSS-based bar
- Color coding based on percentage:
  - 0-89%: Amber/green (on track)
  - 90-100%: Bright amber (near target)
  - 101%+: Red (over target)
- Example ASCII approach:
  ```
  Target: 2000 kcal
  ┌──────┐
  │      │ ← 2000
  │      │
  │████  │ ← 1200 (60%)
  │████  │
  │████  │
  └──────┘
    60%
  ```
- Or block character approach:
  ```
  [████████████░░░░] 1200/2000 kcal (60%)
  ```
- Keep it flat, terminal-style, no gradients or soft shadows

### Branding
- **Sparse branding**
- **ASCII-style logo treatment** if logo is needed
- Example:
  ```
  ███╗   ███╗███████╗ █████╗ ██╗      ██████╗ ██████╗ ███████╗
  ████╗ ████║██╔════╝██╔══██╗██║     ██╔═══██╗██╔══██╗██╔════╝
  ██╔████╔██║█████╗  ███████║██║     ██║   ██║██████╔╝███████╗
  ██║╚██╔╝██║██╔══╝  ██╔══██║██║     ██║   ██║██╔═══╝ ╚════██║
  ██║ ╚═╝ ██║███████╗██║  ██║███████╗╚██████╔╝██║     ███████║
  ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚══════╝
  ```
  Or simpler:
  ```
  MEALOPS v1.0.0
  ```

## Implementation Guidelines

### What to Avoid
- Sans-serif fonts (no Helvetica, Arial, Inter, etc.)
- Rounded corners (`border-radius` should be `0` or very minimal)
- Box shadows, drop shadows, elevation
- Gradients
- Smooth animations (quick transitions OK, but no elaborate motion)
- Modal dialogs (use inline confirmations instead)
- Toast notifications (use status line or inline messages)
- Icons from icon libraries (use ASCII characters: `>`, `+`, `-`, `x`, `*`, `/`, `\`, `|`)
- Soft, spacious padding (use grid-based, character-aligned spacing)

### What to Embrace
- Monospaced fonts everywhere
- Flat, hard-edged rectangles
- Terminal color schemes
- Text-based UI elements
- Inline feedback and output
- Command-line metaphors
- Keyboard shortcuts and navigation
- Grid-aligned layouts
- ASCII art for graphics/icons
- Performance and speed
- Minimal dependencies

## Technical Stack & Architecture

### Technology Requirements

#### JavaScript
- **Vanilla JavaScript only** — no frameworks or UI libraries (no React, Vue, Svelte, etc.)
- **No TypeScript** — plain JavaScript only
- **ES modules** (ESM) using native browser support (`type="module"`)
- Use modern JavaScript features (ES6+) that are natively supported by browsers

#### UI Components
- **Native Web Components** for all UI elements
- Use Custom Elements API (`customElements.define()`)
- Use Shadow DOM for encapsulation where appropriate
- Use HTML templates (`<template>` tags) for component markup
- No UI component libraries — build everything from scratch

#### Build System
- **No build system for production** — the site runs as native JavaScript modules directly in the browser
- No Webpack, Vite, Rollup, Parcel, or any bundler for the main application
- No transpilation, no compilation step
- Files are served as-is to the browser
- Use `import`/`export` syntax with `.js` file extensions explicit in import paths

**Exception: Storybook for Development**
- Storybook is used exclusively for component development and testing
- Storybook has its own build system, but this is isolated to the development environment
- The production application remains completely independent of Storybook
- Storybook files live in `/stories/` directory

#### Dependencies
- **NPM dependencies kept to absolute minimum**
- Prefer zero dependencies if possible
- If a dependency is needed, it must be justified and lightweight
- Use CDN imports via ESM (e.g., `import x from 'https://esm.sh/package'`) if external code is needed
- No package.json bloat

**Development Dependencies:**
- **Storybook**: Used for component development, documentation, and testing
  - Storybook for web components
  - Isolated development environment for each component
  - Does not affect production code or build process
  - Interaction tests for component behavior validation

#### External APIs
**USDA FoodData Central API**
- Used for fetching nutritional information for ingredients
- Free API, no key required for basic use
- Base URL: `https://api.nal.usda.gov/fdc/v1/`
- Endpoint for search: `/foods/search?query={ingredient}`
- Returns nutritional data including protein, carbs, fat, calories
- Cache API responses in IndexedDB to minimize repeated requests
- Handle API errors gracefully with fallback messaging

**API Integration Guidelines:**
- Use native `fetch()` for API calls
- Implement client-side caching for ingredient lookups
- Show loading state while fetching nutrition data
- Allow manual override of nutritional values if API lookup fails or is inaccurate
- Rate limiting: be respectful of the free API (consider debouncing searches)

#### CSS
- Plain CSS files, no preprocessors (no Sass, Less, PostCSS unless absolutely necessary)
- CSS imports via `<link>` tags or `@import` in CSS
- No CSS-in-JS
- Use CSS custom properties (variables) for theming
- CSS transitions for simple interactions, no animation libraries

### Code Style & Conventions

#### JavaScript
- Write clean, readable, maintainable vanilla JavaScript
- Use ES6+ features: arrow functions, destructuring, template literals, async/await
- Prefer functional approaches where appropriate
- Use `const` and `let`, never `var`
- Comment where necessary but prefer self-documenting code
- Keep functions small and focused

#### Web Components
- Each component in its own `.js` file
- Component file names should match the custom element tag (e.g., `recipe-card.js` for `<recipe-card>`)
- Use kebab-case for custom element names (required by spec)
- Example structure:
  ```javascript
  // components/recipe-card.js
  class RecipeCard extends HTMLElement {
    constructor() {
      super();
      // Initialize component
    }

    connectedCallback() {
      this.render();
    }

    render() {
      this.innerHTML = `...`;
    }
  }

  customElements.define('recipe-card', RecipeCard);
  ```

#### File Organization
- `/components/` — web component definitions
- `/styles/` — CSS files
- `/utils/` — utility functions and helpers
- `/app.js` — main application entry point
- `/index.html` — main HTML file

### Performance & Best Practices
- Optimize for fast load times and minimal network requests
- Lazy load components when appropriate
- Use browser caching effectively
- Keep individual JavaScript files small and focused
- Test in modern browsers (Chrome, Firefox, Safari, Edge)
- Embrace browser standards and native APIs
- Progressive enhancement where it makes sense

### What NOT to Use
- ❌ React, Vue, Angular, Svelte, or any framework
- ❌ TypeScript
- ❌ Build tools (Webpack, Vite, Rollup, Parcel, esbuild)
- ❌ Transpilers (Babel)
- ❌ UI component libraries (Material, Bootstrap, Tailwind components)
- ❌ jQuery
- ❌ Heavy NPM dependencies
- ❌ CSS preprocessors (unless absolutely necessary)
- ❌ CSS-in-JS libraries
- ❌ Animation libraries

### What TO Use
- ✅ Vanilla JavaScript (ES6+)
- ✅ Native Web Components (Custom Elements, Shadow DOM, Templates)
- ✅ ES modules (`import`/`export`)
- ✅ Plain CSS with custom properties
- ✅ Native browser APIs (Fetch, localStorage, etc.)
- ✅ Semantic HTML
- ✅ Modern JavaScript features natively supported by browsers

## Development Workflow

### Local Development Server
Use a lightweight Node-based static file server for local development:

```bash
# Install a static server globally (one-time setup)
npm install -g http-server

# Run the development server from project root
http-server -p 8000 -c-1

# Or using npx (no install needed)
npx http-server -p 8000 -c-1
```

The `-c-1` flag disables caching, which is helpful during development.

Access the app at: `http://localhost:8000`

**Alternative**: You can use any static file server you prefer:
- Python: `python3 -m http.server 8000`
- VS Code Live Server extension
- Node `serve` package: `npx serve -p 8000`

### Browser Support
- Target modern browsers: Chrome, Firefox, Safari, Edge (latest versions)
- ES modules must be natively supported
- Web Components (Custom Elements v1) must be supported
- IndexedDB support required
- No polyfills or transpilation — if a browser doesn't support modern features, that's acceptable

### Error Handling

#### Display Style
All errors should be displayed in **terminal-style inline format**:

```
ERROR: Recipe not found [id:abc123]
ERROR: Invalid macro values — protein must be >= 0
ERROR: Failed to save to IndexedDB — quota exceeded
```

#### Guidelines
- Prefix error messages with `ERROR:` in red terminal color
- Display errors inline below the relevant UI element or in a status line
- No alert dialogs, no modal popups
- Keep error messages concise but informative
- Include relevant context (IDs, values, operation attempted)
- Console.log errors for debugging, but always show user-facing message in UI
- For IndexedDB errors, provide actionable feedback when possible

#### Success Messages
Use terminal-style output for success states too:

```
OK: Recipe saved [id:abc123]
OK: 3 servings logged
> recipe deleted
```

### Debugging
- Use browser DevTools for debugging
- Console.log liberally during development
- Use meaningful log prefixes: `[Router]`, `[DB]`, `[RecipeCard]`
- IndexedDB can be inspected via DevTools → Application → IndexedDB

### Storybook for Component Development

**Setup:**
- Use Storybook for web components
- Storybook runs as a separate development environment
- Does not affect the production application (which still runs as vanilla JS modules)
- Install: `npx storybook@latest init`

**Story Requirements:**

1. **Main Site Story:**
   - Create a story for `index.html` showing the full application
   - Allows testing the complete integrated experience
   - File: `stories/index.stories.js`

2. **Component Stories:**
   - Create a `.stories.js` file for each web component
   - Each story should demonstrate the component in isolation
   - Include multiple variants/states of the component
   - Examples:
     - `stories/RecipeCard.stories.js`
     - `stories/InventoryCard.stories.js`
     - `stories/CalorieGauge.stories.js`
     - `stories/CommandPalette.stories.js`

**Story Structure Example:**
```javascript
// stories/RecipeCard.stories.js
export default {
  title: 'Components/RecipeCard',
  tags: ['autodocs'],
};

export const Default = {
  render: () => {
    const card = document.createElement('recipe-card');
    card.setAttribute('recipe-name', 'Chicken Soup');
    card.setAttribute('servings', '8');
    return card;
  },
};

export const LowInventory = {
  render: () => {
    const card = document.createElement('recipe-card');
    card.setAttribute('recipe-name', 'Veggie Stir-Fry');
    card.setAttribute('servings', '2');
    return card;
  },
};
```

**Interaction Testing:**
- Use Storybook's `@storybook/test` for interaction tests
- Create interaction tests for each component
- Test all user interactions:
  - Button clicks
  - Form submissions
  - Input changes
  - Keyboard navigation
  - State changes
  - Event dispatching

**Interaction Test Example:**
```javascript
// stories/RecipeCard.stories.js
import { expect } from '@storybook/test';
import { userEvent, within } from '@storybook/test';

export const ClickToView = {
  render: () => {
    const card = document.createElement('recipe-card');
    card.setAttribute('recipe-name', 'Pasta Bake');
    return card;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viewButton = canvas.getByText('view');

    await userEvent.click(viewButton);

    // Assert that event was dispatched or state changed
    await expect(card.classList.contains('expanded')).toBe(true);
  },
};
```

**Testing Guidelines:**
- Test each component interaction in isolation
- Verify state changes after user actions
- Test keyboard accessibility (Tab, Enter, Escape, arrow keys)
- Test edge cases (empty states, max values, invalid inputs)
- Ensure terminal-style interactions work correctly
- Test command palette commands and shortcuts

**Running Storybook:**
```bash
# Start Storybook dev server
npm run storybook

# Run interaction tests
npm run test-storybook

# Build static Storybook for deployment (optional)
npm run build-storybook
```

**Benefits:**
- Develop components in isolation
- Visual regression testing
- Component documentation
- Interaction testing without full app context
- Easier debugging of component-specific issues

## Reference Aesthetic
Think of these as visual references:
- Classic Unix terminals
- Hacker News (ycombinator.com)
- Old BBS systems
- `htop`, `vim`, `tmux` interfaces
- Developer tools and consoles
- The Matrix terminal aesthetic (without the falling characters)
