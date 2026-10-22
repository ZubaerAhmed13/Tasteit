export const STORAGE_KEY = 'tasteit.local.v1';

export function emptyStore() {
  return { pantry: [], saved: {}, plan: {} };
}

export function loadStore(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return emptyStore();
    return {
      pantry: Array.isArray(parsed.pantry) ? parsed.pantry.filter(x => x && typeof x.name === 'string') : [],
      saved: parsed.saved && typeof parsed.saved === 'object' && !Array.isArray(parsed.saved) ? parsed.saved : {},
      plan: parsed.plan && typeof parsed.plan === 'object' && !Array.isArray(parsed.plan) ? parsed.plan : {}
    };
  } catch {
    return emptyStore();
  }
}

export function persistStore(store, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function normalizeIngredient(value) {
  const singular = {
    tomatoes: 'tomato', potatoes: 'potato', chillies: 'chilli',
    chilies: 'chilli', leaves: 'leaf', cloves: 'clove',
    eggs: 'egg', 'spring onions': 'spring onion', scallions: 'spring onion',
    'bell peppers': 'bell pepper', capsicum: 'bell pepper',
    'garlic cloves': 'garlic', 'cloves garlic': 'garlic'
  };
  const base = String(value || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[_-]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (singular[base]) return singular[base];
  if (base.endsWith('ies') && base.length > 5) return base.slice(0, -3) + 'y';
  if (base.endsWith('s') && !base.endsWith('ss') && base.length > 4) return base.slice(0, -1);
  return base;
}

export function ingredientsOf(meal) {
  if (!meal) return [];
  const ingredients = [];
  for (let i = 1; i <= 20; i += 1) {
    const name = String(meal['strIngredient' + i] || '').trim();
    if (name) ingredients.push({ name, measure: String(meal['strMeasure' + i] || '').trim() });
  }
  return ingredients;
}

export function analyseMeal(meal, pantry) {
  const available = new Set(pantry.map(i => normalizeIngredient(i.name)).filter(Boolean));
  const ingredients = ingredientsOf(meal);
  const have = ingredients.filter(i => available.has(normalizeIngredient(i.name)));
  const missing = ingredients.filter(i => !available.has(normalizeIngredient(i.name)));
  return {
    have, missing, total: ingredients.length,
    percent: ingredients.length ? Math.round(100 * have.length / ingredients.length) : 0,
    // Presence-only matching. Amounts, expiry and interchangeability are not verified.
    isPresenceMatch: ingredients.length > 0 && missing.length === 0
  };
}

export function shoppingList(plan, saved, pantry) {
  const available = new Set(pantry.map(i => normalizeIngredient(i.name)));
  const shopping = new Map();
  for (const [day, mealId] of Object.entries(plan)) {
    const meal = saved[mealId]?.meal;
    if (!meal) continue;
    for (const ingredient of ingredientsOf(meal)) {
      const key = normalizeIngredient(ingredient.name);
      if (!key || available.has(key)) continue;
      if (!shopping.has(key)) shopping.set(key, { name: ingredient.name, meals: [], measures: [] });
      const entry = shopping.get(key);
      if (!entry.meals.includes(meal.strMeal)) entry.meals.push(meal.strMeal);
      if (ingredient.measure) entry.measures.push(ingredient.measure);
    }
  }
  return [...shopping.values()].sort((a,b) => a.name.localeCompare(b.name));
}

export function nextSevenDates(from = new Date()) {
  const out = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
    const key = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    out.push({ key, label: new Intl.DateTimeFormat('en', { weekday: 'long' }).format(d), date: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d) });
  }
  return out;
}