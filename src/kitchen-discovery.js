import { analyseMeal, normalizeIngredient, usablePantryItem } from './model.js';

export const MAX_KITCHEN_SEARCH = 4;

// One selectable ingredient per normalised name; individual dated stock lots
// remain separate in the actual pantry and quantity comparisons.
export function kitchenIngredientChoices(pantry, now = new Date()) {
  const groups = new Map();
  for (const item of pantry) {
    if (!usablePantryItem(item, now)) continue;
    const key = normalizeIngredient(item.name);
    if (!key) continue;
    const row = groups.get(key) || { key, name:item.name.trim(), dates:[], batches:0 };
    row.batches++;
    if (typeof item.expiry === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.expiry)) {
      const time = new Date(item.expiry + 'T12:00:00');
      if (!Number.isNaN(time.getTime())) row.dates.push(time.getTime());
    }
    groups.set(key,row);
  }
  return [...groups.values()].map(row => ({
    key:row.key, name:row.name, batches:row.batches,
    soonest:row.dates.length ? Math.min(...row.dates) : Infinity
  })).sort((a,b) => a.soonest - b.soonest || a.name.localeCompare(b.name));
}

export function initialKitchenSelection(pantry, now = new Date()) {
  return kitchenIngredientChoices(pantry,now).slice(0,MAX_KITCHEN_SEARCH).map(row=>row.key);
}

export function reconcileKitchenSelection(pantry, selection, now = new Date()) {
  const available = new Set(kitchenIngredientChoices(pantry,now).map(row=>row.key));
  const unique = [...new Set(Array.isArray(selection) ? selection : [])];
  return unique.filter(key=>available.has(key)).slice(0,MAX_KITCHEN_SEARCH);
}

export function searchPantryRows(pantry,selection,now=new Date()) {
  const keys = new Set(reconcileKitchenSelection(pantry,selection,now));
  const picked = [];
  for(const choice of kitchenIngredientChoices(pantry,now)) {
    if(keys.has(choice.key)) picked.push({name:choice.name});
  }
  return picked;
}

export function kitchenMatchDetails(meal, pantry) {
  const score = analyseMeal(meal,pantry);
  const caution = score.availability.filter(x=>x.status==='review' || x.status==='short');
  return {
    total:score.total,
    matched:score.have.length,
    missing:score.missing.map(x=>x.name),
    needReview:caution.map(x=>x.name),
    confirmed:score.isQuantityConfirmed,
    // No protein/portion/allergen claim; even confirmed quantities are estimates.
    explanation:score.total ?
      score.have.length + ' of ' + score.total + ' ingredient names on hand' :
      'Ingredient details not available'
  };
}

export function localKitchenRecipes(saved, pantry) {
  const candidates = Object.values(saved || {}).map(entry=>entry?.meal)
    .filter(meal=>meal && Array.isArray(meal) === false && typeof meal.strMeal==='string');
  return candidates.filter(meal=>kitchenMatchDetails(meal,pantry).matched>0);
}

export function combineKitchenRecipes(remote, local) {
  const unique = new Map();
  for (const meal of [...local,...remote]) {
    const id = String(meal?.idMeal || '');
    if (id && !unique.has(id)) unique.set(id,meal);
  }
  return [...unique.values()];
}
