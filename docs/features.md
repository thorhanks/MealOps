# MealOps — Feature Specifications

## Application Sections

The app has three primary sections connected by a data pipeline:

```
COOK (create recipes, add to inventory)
  → EAT (view inventory, log consumption)
    → TRACK (view macros, trends, log ad-hoc food)
```

**Data flow:**
- **Cook → Eat**: Production entries add servings to inventory
- **Eat → Track**: Consumption entries provide data for macro tracking
- **Track → Eat**: Deleting recipe consumption restores inventory count
- **Track**: Can also log ad-hoc foods directly (bypasses Eat/inventory)
- **Cook → Track**: Recipe macros define nutritional values for tracking

---

## 1. Cook (Recipes) — `#/cook`

Grid card display of souper cube recipes. Create, edit, view, and delete recipes.

### Sub-routes
- `#/cook` — recipe grid
- `#/cook/:id` — view single recipe
- `#/cook/:id/edit` — edit recipe

### Recipe Card Display
Each card shows:
- Recipe name
- Macros per serving (protein, carbs, fat, calories)
- Current inventory count (servings available)
- Quick actions: `[view]` `[edit]` `[x]` `[+ made]`

### Recipe Creation Workflow

1. User enters:
   - Recipe name
   - Ingredients (name, amount, unit)
   - Preparation instructions
   - Number of servings
2. For each ingredient, the app:
   - Searches USDA FoodData Central API for nutritional data
   - Presents matching results for user to select
   - Fetches full nutritional data for the selected item
   - Converts amount/unit to grams using the built-in conversion table
   - Calculates macros for the specified amount
3. App calculates:
   - Total macros for the entire recipe (sum of all ingredients)
   - Per-serving macros (total / number of servings)
4. Recipe is saved with all ingredient nutrition data and calculated macros

### Editing Recipes
- All fields are editable after creation, including servings count
- **Retroactive recalculation**: When servings count changes, per-serving macros are recalculated and all existing log entries (production and consumption) are updated to reflect the new per-serving values
- Editing ingredients triggers re-lookup/recalculation of affected nutrition data

### Deleting Recipes
- **Soft delete**: Recipe is marked as archived/deleted but not removed from the database
- All associated production and consumption log entries are preserved
- Archived recipes no longer appear in the Cook grid
- Archived recipes still appear in Track history and can be referenced by log entries
- Inventory for soft-deleted recipes is no longer shown in Eat

### Adding to Inventory
- User clicks `[+ made]` on any recipe card
- Prompted for number of servings made
- Creates a production log entry with timestamp
- Inventory count updates immediately

### USDA API Integration

**API details:**
- Base URL: `https://api.nal.usda.gov/fdc/v1/`
- Search endpoint: `/foods/search?query={ingredient}&api_key={key}`
- **Requires a free API key** (register at https://fdc.nal.usda.gov/api-key-signup.html)
- Cache responses in IndexedDB to minimize repeated requests
- Debounce search requests

**USDA nutrient IDs to extract:**
- Protein: nutrient ID 1003
- Total Fat: nutrient ID 1004
- Carbohydrates: nutrient ID 1005
- Calories (Energy): nutrient ID 1008

**USDA lookup is always optional.** Users can:
- Use the API to fetch nutrition data (default)
- Skip API lookup and manually enter macros for any ingredient
- Override API-fetched values with manual entries
- Mark manually-entered data to distinguish from API data

**When API is unreachable:** Show inline error and let user enter macros manually. Recipe creation is never blocked by network issues.

### Unit Conversion

Support a fixed set of common units with a built-in conversion table to grams:

| Unit | Abbreviations | Approx grams |
|------|--------------|---------------|
| gram | g, grams | 1 |
| kilogram | kg | 1000 |
| ounce | oz | 28.35 |
| pound | lb, lbs | 453.6 |
| cup | cups | ~240 (liquid) |
| tablespoon | tbsp | ~15 |
| teaspoon | tsp | ~5 |
| milliliter | ml | ~1 |
| liter | l | ~1000 |
| piece/unit | pc, piece, each | varies by food |

Notes:
- For volume units (cup, tbsp, tsp), use water-weight approximation or let user confirm gram equivalent
- For "piece" units, use USDA serving size data when available
- The conversion table is a reasonable approximation; users can override if precision matters
- Display both the user's original unit and the calculated gram weight

---

## 2. Eat (Inventory & Consumption) — `#/eat`

Display current inventory and log consumption.

### Stacked Card Visual Design

Grid layout where each card appears as a "stack" representing inventory depth:

| Servings | Stack Level | Visual |
|----------|------------|--------|
| 0 | Hidden or flat/faded | No stack effect |
| 1–3 | Few | Thin stack (slight shadow/offset) |
| 4–10 | Some | Medium stack (moderate layering) |
| 11+ | Many | Thick stack (prominent layering) |

Stack effect uses hard-edged CSS box-shadows (no blur) with amber color at varying opacity. See [design-spec.md](design-spec.md) for CSS examples.

### Card Display
Each card shows:
- Recipe name
- Exact inventory count (e.g., "7 servings")
- Macros per serving
- Quick action: `[eat]`

### Consumption Workflow
1. User clicks `[eat]` on a recipe card
2. Prompted to enter number of servings consumed
3. **Input validation**: Rejects if requested amount exceeds available inventory (inventory cannot go negative)
4. Logs consumption with timestamp
5. Decrements inventory count
6. Card visual updates (stack depth changes)
7. Consumption data feeds into Track section

### Inventory Calculation
```
current inventory = Σ(production servings) - Σ(consumption servings)
```
Filtered by recipeId. Ad-hoc foods (recipeId=null) don't affect inventory.

### Empty State
```
> no servings in inventory
> make recipes in [cook] section to add to inventory
```

---

## 3. Track (Dashboard) — `#/track`

Daily nutritional tracking dashboard.

### Target Calorie Setting
- User enters a daily calorie target (max)
- Editable at any time, persisted in user settings
- Used for bar gauge and weekly trend comparisons
- Display: `target: 2000 kcal/day`

### Date Selection
- Date picker defaulting to current day
- All displayed data updates when date changes
- Terminal-style display: `> showing: 2024-01-15`

### Ad-hoc Food Logging

**Input method: Structured fields** (not free-text parsing)
- Separate input fields for:
  - Food name (text input)
  - Amount (number input)
  - Unit (dropdown or text input)
- User submits → app searches USDA API by food name
- User selects correct food item from results
- App calculates macros based on amount/unit
- Entry saved with recipeId=null

Ad-hoc foods:
- Don't affect inventory
- Can only be deleted from Track section
- Use same USDA API and caching as recipe ingredients

### Daily Consumption Log

List of all food consumed on the selected date (both recipe servings and ad-hoc):

```
> consumption log [2024-01-15]
08:30  chicken soup      2 servings    [p:40g c:30g f:10g cal:380]  [x]
10:15  apple             1 medium      [p:0g  c:25g f:0g  cal:95]   [x]
12:45  veggie stir-fry   1 serving     [p:15g c:45g f:8g  cal:300]  [x]
```

### Delete Functionality
- User clicks `[x]` on any entry
- Inline confirmation: `> delete entry? [y/n]`
- If recipe-based: restores inventory count
- Recalculates all macro totals
- Updates bar gauge and weekly trend

### Macro Summary — Bar Gauge

Horizontal bar showing calorie consumption vs target:

```
[████████████░░░] 1160 / 2000 kcal (58%)
```

Color coding:
- 0–89%: Amber (on track)
- 90–100%: Bright amber (near target)
- 101%+: Red (over target)

Also displays macro breakdown: Protein Xg, Carbs Xg, Fat Xg

### Weekly Trend Chart

7-day view (Sunday through Saturday) showing daily calories vs target:

```
> weekly trend [week of 2024-01-14]

Sun  [████████████████] 2100  (105%)
Mon  [████████████░░░░] 1600  (80%)
Tue  [██████████████░░] 1850  (93%)
Wed  [████████████████] 2000  (100%)
Thu  [███████░░░░░░░░░] 950   (48%)
Fri  [████████████████] 2050  (103%)
Sat  [██████████████░░] 1800  (90%)
```

- Week always starts on **Sunday**
- Days over target shown in red, under in amber
- Current selected day highlighted
- Shows the week containing the currently selected date

### Macro Calculation Logic
For the selected date:
1. Pull all consumption entries for that date
2. For each entry:
   - **Recipe-based** (recipeId exists): Get recipe macros per serving × servings consumed
   - **Ad-hoc** (recipeId null): Use macros stored in the entry
3. Sum totals: protein, carbs, fat, calories
4. Compare calories against daily target

---

## Cross-cutting Features

### Command Palette
- Triggered by `Ctrl+K`, `Cmd+K`, or `/` key
- Terminal-style overlay with autocomplete
- Commands: `cook`, `eat`, `track`, `add recipe`, `log serving`, `export data`, `import data`, `search [query]`, `help`, `shortcuts`
- Fuzzy matching for suggestions
- Escape to close

### Data Import/Export
- **Export**: `> export data` → downloads `mealops-data-[timestamp].json` with all recipes and log entries
- **Import**: `> import data` → file picker, validates JSON, shows summary, handles duplicate IDs
- Accessible via command palette

### Navigation
- Hash-based routing: `#/cook`, `#/eat`, `#/track`
- Sub-routes: `#/cook/:id`, `#/cook/:id/edit`
- All navigation is client-side, no page reloads
- Keyboard-first: all actions accessible via keyboard
