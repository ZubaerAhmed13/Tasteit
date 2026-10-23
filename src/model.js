import { evaluateQuantity } from './quantities.js';
import { plannedIngredients, validServings } from './servings.js';
import { validCookingSessions } from './cooking.js';
import { validShoppingState } from './shopping.js';
export const STORAGE_KEY = 'tasteit.local.v1';

export function emptyStore() {
  return { pantry: [], saved: {}, plan: {}, planServings: {}, cookingSessions: {}, shoppingChecked: {}, shoppingExtras: [] };
}

export function loadStore(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const parsed = JSON.parse(target?.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return emptyStore();
    return {
      pantry: Array.isArray(parsed.pantry) ? parsed.pantry.filter(x => x && typeof x.name === 'string') : [],
      saved: parsed.saved && typeof parsed.saved === 'object' && !Array.isArray(parsed.saved) ? parsed.saved : {},
      plan: parsed.plan && typeof parsed.plan === 'object' && !Array.isArray(parsed.plan) ? parsed.plan : {},
      planServings: parsed.planServings && typeof parsed.planServings === 'object' && !Array.isArray(parsed.planServings) ? parsed.planServings : {},
      cookingSessions: validCookingSessions(parsed.cookingSessions) && parsed.cookingSessions ? parsed.cookingSessions : {},
      shoppingChecked: validShoppingState(parsed.shoppingChecked,undefined) && parsed.shoppingChecked ? parsed.shoppingChecked : {},
      shoppingExtras: validShoppingState(undefined,parsed.shoppingExtras) && parsed.shoppingExtras ? parsed.shoppingExtras : []
    };
  } catch {
    return emptyStore();
  }
}

export function persistStore(store, storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.setItem !== 'function') return false;
    target.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function normalizeIngredient(value) {
  // Only genuinely equivalent regional labels are combined.
  // Never generalise "chicken" to "chicken breast", "milk" to "oat milk",
  // fresh coriander to coriander seeds, or chilli to bell pepper.
  const aliases = {
    tomatoes:'tomato', potatoes:'potato', eggs:'egg',
    onions:'onion', carrots:'carrot', lemons:'lemon',
    limes:'lime', mushrooms:'mushroom', lentils:'lentil',
    chickpeas:'chickpea', 'chick peas':'chickpea',
    'garbanzo bean':'chickpea', 'garbanzo beans':'chickpea',
    'spring onions':'spring onion', scallion:'spring onion',
    scallions:'spring onion', 'green onion':'spring onion',
    'green onions':'spring onion',
    'garlic cloves':'garlic', 'cloves garlic':'garlic',
    'bell peppers':'bell pepper', capsicum:'bell pepper',
    aubergine:'eggplant', aubergines:'eggplant',
    eggplants:'eggplant', courgette:'zucchini',
    courgettes:'zucchini', zucchinis:'zucchini',
    chilies:'chilli', chillies:'chilli', chili:'chilli', chilis:'chilli',
    'red chillies':'red chilli', 'red chilies':'red chilli',
    'red chilis':'red chilli',
    'red onions':'red onion', 'white onions':'white onion',
    'shallots':'shallot', 'garlic bulbs':'garlic bulb'
  };
  const base = String(value || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[_-]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return '';
  if (aliases[base]) return aliases[base];
  // Prevent irreversible singularisation of mass nouns ending with "s".
  if (['couscous','hummus','asparagus','citrus','molasses','treacle',
    'watercress','bass','sea bass'].includes(base)) return base;
  if (base.endsWith('ies') && base.length > 5) return base.slice(0,-3) + 'y';
  if (base.endsWith('s') && !base.endsWith('ss') && base.length > 4) return base.slice(0,-1);
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

export function usablePantryItem(item, today = new Date()) {
  if (!item || !normalizeIngredient(item.name)) return false;
  if (item.quantity !== '' && item.quantity !== null && item.quantity !== undefined && Number(item.quantity) <= 0) return false;
  if (item.expiry && /^\d{4}-\d{2}-\d{2}$/.test(item.expiry)) {
    const expiry = new Date(item.expiry + 'T00:00:00');
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!Number.isNaN(expiry.getTime()) && expiry < start) return false;
  }
  return true;
}

export function analyseMeal(meal, pantry) {
  const lots = pantry.filter(item => usablePantryItem(item));
  const available = new Set(lots.map(i => normalizeIngredient(i.name)).filter(Boolean));
  const ingredients = ingredientsOf(meal);
  const have = ingredients.filter(i => available.has(normalizeIngredient(i.name)));
  const missing = ingredients.filter(i => !available.has(normalizeIngredient(i.name)));
  const availability = ingredients.map(ingredient => {
    const name = normalizeIngredient(ingredient.name);
    const matches = lots.filter(item => normalizeIngredient(item.name) === name);
    return { ...ingredient, ...evaluateQuantity([ingredient.measure], matches) };
  });
  return {
    have, missing, availability, total: ingredients.length,
    percent: ingredients.length ? Math.round(100 * have.length / ingredients.length) : 0,
    isPresenceMatch: ingredients.length > 0 && missing.length === 0,
    // Every ingredient has a measurable, matching available amount.
    isQuantityConfirmed: ingredients.length > 0 && availability.every(x => x.status === 'enough')
  };
}

export function shoppingList(plan, saved, pantry, planServings = {}) {
  // Each planned day counts. This deliberately does not mutate stock when a meal is planned.
  const usable = pantry.filter(item => usablePantryItem(item));
  const grouped = new Map();
  for (const [day, mealId] of Object.entries(plan)) {
    const recipe = saved[mealId];
    const meal = recipe?.meal;
    if (!meal) continue;
    for (const ingredient of plannedIngredients(meal, recipe.baseServings, planServings?.[day])) {
      const key = normalizeIngredient(ingredient.name);
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, {
        name: ingredient.name, meals: [], measures: [], requirements: []
      });
      const entry = grouped.get(key);
      if (!entry.meals.includes(meal.strMeal)) entry.meals.push(meal.strMeal);
      if (ingredient.measure) entry.measures.push(ingredient.measure);
      entry.requirements.push(ingredient.measure);
    }
  }
  return [...grouped.entries()].flatMap(([key, entry]) => {
    const lots = usable.filter(item => normalizeIngredient(item.name) === key);
    const verdict = evaluateQuantity(entry.requirements, lots);
    if (verdict.status === 'enough') return [];
    const { requirements, ...details } = entry;
    return [{ ...details, ...verdict }];
  }).sort((a,b) => a.name.localeCompare(b.name));
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

const MAX_BACKUP_SIZE = 2_000_000;

export function exportBackup(store, now = new Date()) {
  return JSON.stringify({
    format: 'tasteit-backup', version: 1, exportedAt: now.toISOString(),
    data: { pantry: store.pantry, saved: store.saved, plan: store.plan,
      ...(store.planServings === undefined ? {} : { planServings:store.planServings }),
      ...(store.cookingSessions === undefined ? {} : { cookingSessions:store.cookingSessions }),
      ...(store.shoppingChecked === undefined ? {} : { shoppingChecked:store.shoppingChecked }),
      ...(store.shoppingExtras === undefined ? {} : { shoppingExtras:store.shoppingExtras }) }
  }, null, 2);
}

export function parseBackup(text) {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_SIZE) throw new Error('Backup must be a JSON file smaller than 2 MB.');
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error('This is not valid JSON.'); }
  if (backup?.format !== 'tasteit-backup' || backup.version !== 1 || !backup.data) {
    throw new Error('This is not a supported Tasteit backup.');
  }
  const { pantry, saved, plan, planServings, cookingSessions, shoppingChecked, shoppingExtras } = backup.data;
  if (!Array.isArray(pantry) || !saved || typeof saved !== 'object' || Array.isArray(saved) || !plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new Error('The backup is missing its recipe, pantry or plan records.');
  }
  if (pantry.length > 3000 || Object.keys(saved).length > 3000 || Object.keys(plan).length > 1000 || (planServings && Object.keys(planServings).length > 1000)) {
    throw new Error('Backup contains too many items.');
  }
  if (!validCookingSessions(cookingSessions)) throw new Error('The backup contains invalid cooking sessions.');
  if (!validShoppingState(shoppingChecked,shoppingExtras)) throw new Error('The backup contains invalid shopping checklist records.');
  if (planServings !== undefined && (!planServings || typeof planServings !== 'object' || Array.isArray(planServings) || !Object.entries(planServings).every(([day,n]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && validServings(n) === n))) {
    throw new Error('The backup contains invalid meal serving counts.');
  }
  if (!pantry.every(item => item && typeof item.name === 'string' && item.name.length <= 150) ||
      !Object.entries(saved).every(([key, entry]) => key.length < 160 && entry && typeof entry === 'object' &&
        entry.meal && typeof entry.meal.strMeal === 'string' && entry.meal.strMeal.length <= 200) ||
      !Object.entries(plan).every(([key, id]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && typeof id === 'string')) {
    throw new Error('The backup contains invalid records.');
  }
  return { pantry, saved, plan, ...(planServings === undefined ? {} : { planServings }),
    ...(cookingSessions === undefined ? {} : { cookingSessions }),
    ...(shoppingChecked === undefined ? {} : { shoppingChecked }),
    ...(shoppingExtras === undefined ? {} : { shoppingExtras }) };
}

export function createPersonalMeal(input, id) {
  const title = String(input.title || '').trim();
  const origin = String(input.origin || '').trim();
  const instructions = String(input.instructions || '').trim();
  const source = String(input.source || '').trim();
  if (source) {
    if (source.length > 500) throw new Error('Source link must be 500 characters or fewer.');
    try {
      const url = new URL(source);
      if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) {
        throw new Error('Invalid source');
      }
    } catch { throw new Error('Enter a valid https:// source link, or leave it empty.'); }
  }
  const items = String(input.ingredients || '').split(/\r?\n/).map(row => row.trim()).filter(Boolean).map(row => {
    const split = row.indexOf('|');
    return split === -1 ? { name: row, measure: '' } : {
      name: row.slice(0, split).trim(), measure: row.slice(split + 1).trim()
    };
  });
  if (!title || title.length > 120) throw new Error('Enter a recipe name (up to 120 characters).');
  if (origin.length > 80) throw new Error('Cuisine name is too long.');
  if (!instructions || instructions.length > 15_000) throw new Error('Add cooking instructions (up to 15,000 characters).');
  if (!items.length || items.length > 20 || items.some(item => !item.name || item.name.length > 100 || item.measure.length > 100)) {
    throw new Error('Enter between 1 and 20 ingredients, one per line. Separate amounts with |.');
  }
  if (!id || !String(id).startsWith('personal-')) throw new Error('Invalid personal recipe identifier.');
  const meal = { idMeal: id, strMeal: title, strArea: origin || 'My kitchen',
    strCategory: 'My own recipe', strInstructions: instructions,
    strMealThumb: '', strSource: source, strPersonal: true };
  items.forEach((item, index) => {
    meal['strIngredient' + (index + 1)] = item.name;
    meal['strMeasure' + (index + 1)] = item.measure;
  });
  return meal;
}

export function recordCooking(entry, { rating = 0, note = '' } = {}, when = new Date()) {
  const value = Number(rating || 0);
  const message = String(note || '').trim();
  if (!Number.isInteger(value) || value < 0 || value > 5) throw new Error('Choose a rating from 1 to 5, or leave it unrated.');
  if (message.length > 1000) throw new Error('Cooking notes must be 1,000 characters or fewer.');
  if (!(when instanceof Date) || !Number.isFinite(when.getTime())) throw new Error('Invalid cooking date.');
  const log = {
    date: when.toISOString(),
    rating: value,
    note: message
  };
  return {
    ...entry,
    cookedCount: (Number.isSafeInteger(entry.cookedCount) && entry.cookedCount >= 0 ? entry.cookedCount : 0) + 1,
    lastCooked: log.date,
    cookingHistory: [log, ...(Array.isArray(entry.cookingHistory) ? entry.cookingHistory : [])].slice(0, 30)
  };
}
