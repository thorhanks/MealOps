// Unit conversion table: unit name/abbreviation → grams
// For volume units, uses water-weight approximation
const CONVERSIONS = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  lbs: 453.6,
  pound: 453.6,
  pounds: 453.6,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

// Units that don't have a fixed gram conversion
const VARIABLE_UNITS = new Set([
  'pc', 'pcs', 'piece', 'pieces', 'each', 'unit', 'units',
  'small', 'medium', 'large',
]);

// Common units for dropdown display
const UNIT_OPTIONS = [
  { value: 'g', label: 'g (grams)' },
  { value: 'kg', label: 'kg (kilograms)' },
  { value: 'oz', label: 'oz (ounces)' },
  { value: 'lb', label: 'lb (pounds)' },
  { value: 'cup', label: 'cup' },
  { value: 'tbsp', label: 'tbsp (tablespoon)' },
  { value: 'tsp', label: 'tsp (teaspoon)' },
  { value: 'ml', label: 'ml (milliliters)' },
  { value: 'l', label: 'l (liters)' },
  { value: 'piece', label: 'piece/unit' },
];

/**
 * Convert an amount in the given unit to grams.
 * Returns null if unit is variable (piece, each, etc.)
 */
function toGrams(amount, unit) {
  const key = unit.toLowerCase().trim();
  if (VARIABLE_UNITS.has(key)) return null;
  const factor = CONVERSIONS[key];
  if (factor == null) return null;
  return amount * factor;
}

/**
 * Check if a unit has a fixed gram conversion.
 */
function hasFixedConversion(unit) {
  const key = unit.toLowerCase().trim();
  return key in CONVERSIONS;
}

export { UNIT_OPTIONS, toGrams, hasFixedConversion };
