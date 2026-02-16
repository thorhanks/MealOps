# MealOps — Data Model & Storage

## IndexedDB Configuration

- **Database name**: `mealops`
- **Version**: `1` (increment on schema changes)

### Object Stores

| Store Name | Key Path | Auto-increment | Indexes |
|-----------|----------|----------------|---------|
| `recipes` | `id` | No (UUID) | `name`, `deleted` |
| `servingsLog` | `id` | No (UUID) | `recipeId`, `type`, `date`, `[type+date]` (compound) |
| `ingredientCache` | `id` | No (USDA FDC ID or custom) | `name`, `cached` |
| `settings` | `id` | No (fixed key) | — |

### Migration Strategy
- Version-based migrations using IndexedDB's `onupgradeneeded` event
- Each version increment includes a migration function
- Migrations are forward-only (no rollback)
- Store the migration logic in a dedicated `db.js` utility module

---

## Schemas

### Recipe

```javascript
{
  id: string,              // UUID v4
  name: string,
  ingredients: [
    {
      name: string,
      amount: number,       // user-entered amount
      unit: string,         // user-entered unit (g, oz, cup, etc.)
      gramsEquivalent: number, // calculated gram weight for nutrition calc
      nutrition: {          // per the specified amount (not per 100g)
        protein: number,    // grams
        carbs: number,      // grams
        fat: number,        // grams
        calories: number    // kcal
      },
      source: string,       // 'usda-api' or 'manual'
      usdaId: string|null   // USDA FDC ID if from API
    }
  ],
  instructions: string,
  servings: number,         // number of servings this recipe makes
  macros: {                 // calculated: sum of ingredients / servings
    protein: number,
    carbs: number,
    fat: number,
    calories: number
  },
  deleted: boolean,         // soft delete flag (default: false)
  created: number,          // timestamp (Date.now())
  updated: number           // timestamp (Date.now())
}
```

### Servings Log Entry

```javascript
{
  id: string,              // UUID v4
  recipeId: string|null,   // recipe reference (null for ad-hoc foods)
  type: string,            // 'production' or 'consumption'

  // For recipe-based entries:
  servings: number,        // number of servings produced/consumed

  // For ad-hoc food entries (recipeId is null):
  foodName: string,        // name of the food item
  amount: number,          // quantity consumed
  unit: string,            // unit (grams, pieces, cups, etc.)
  macros: {                // nutrition data from USDA or manual entry
    protein: number,
    carbs: number,
    fat: number,
    calories: number
  },

  date: number,            // timestamp of when it was made/eaten
  created: number          // timestamp of when the entry was created
}
```

**Entry types:**

| Type | recipeId | Description |
|------|----------|-------------|
| `production` | required | Recipe was made, servings added to inventory |
| `consumption` | required | Recipe serving was eaten from inventory |
| `consumption` | `null` | Ad-hoc food logged directly (no inventory impact) |

### Ingredient Nutrition Cache

```javascript
{
  id: string,              // USDA FDC ID or 'manual-{name}'
  name: string,
  nutrition: {             // per 100g (standardized)
    protein: number,
    carbs: number,
    fat: number,
    calories: number
  },
  source: string,          // 'usda-api' or 'manual'
  usdaId: string|null,
  cached: number           // timestamp
}
```

### User Settings

```javascript
{
  id: 'user-settings',    // fixed key (single document)
  targetCalories: number,  // daily calorie target/max
  created: number,
  updated: number
}
```

---

## Key Data Operations

### Inventory Calculation
```
inventory(recipeId) = Σ servings WHERE type='production' AND recipeId=X
                    - Σ servings WHERE type='consumption' AND recipeId=X
```

- Only recipes with `deleted: false` are shown in the Eat section
- Consumption is **validated at input**: reject if requested > available inventory
- Inventory can never go negative through normal operations

### Recipe Soft Delete
When a recipe is deleted:
1. Set `recipe.deleted = true`
2. All associated log entries remain untouched
3. Recipe disappears from Cook grid and Eat inventory
4. Track section continues to display historical consumption data
5. Log entries reference the recipe by ID; recipe data is still readable for macro display

### Retroactive Servings Recalculation
When a recipe's servings count is edited:
1. Recalculate `recipe.macros` (total ingredient macros / new servings count)
2. Update `recipe.updated` timestamp
3. All consumption entries for this recipe automatically reflect new per-serving macros because they store `servings` count and reference the recipe for macro values
4. No need to update log entries themselves — they reference the recipe dynamically

**Important**: This means the Track section must always calculate macros by looking up the current recipe macros and multiplying by the logged servings count, not by storing pre-calculated macros in log entries.

### Daily Macro Calculation
For a given date:
1. Query `servingsLog` with compound index `[type+date]` for `type='consumption'`
2. For each entry:
   - If `recipeId` exists: look up recipe → `recipe.macros × entry.servings`
   - If `recipeId` is null: use `entry.macros` directly
3. Sum all values for totals

### Deletion of Consumption Entries
When a consumption entry is deleted from Track:
1. If recipe-based (`recipeId` exists): inventory is automatically restored (the consumption subtraction is removed)
2. If ad-hoc (`recipeId` is null): just remove the entry
3. Recalculate displayed totals

---

## ID Generation

Use `crypto.randomUUID()` for all IDs. Supported in all modern browsers.
