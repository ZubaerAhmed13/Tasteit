import { parseMeasure, displayAmount } from './quantities.js';

export const MAX_SERVINGS = 24;

export function validServings(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{1,2}$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) && n >= 1 && n <= MAX_SERVINGS ? n : null;
}

// TheMealDB does not reliably provide a serving count. Only a user-confirmed
// original serving count allows a change to the recipe's ingredient amounts.
export function scaleMeasure(raw, originalServings, targetServings) {
  const original = String(raw ?? '').trim();
  const base = validServings(originalServings);
  const target = validServings(targetServings);
  if (!base || !target) return { value:original, status:'unscaled', machineMeasure:original };
  if (base === target) return { value:original, status:'original', machineMeasure:original };
  const parsed = parseMeasure(original);
  if (!parsed) return { value:original, status:'review', machineMeasure:'' };
  const scaled = parsed.quantity * target / base;
  if (!Number.isFinite(scaled) || scaled <= 0) return { value:original, status:'review', machineMeasure:'' };
  // A fraction of a whole item needs a human decision: "half an egg" may not
  // make sense for that dish. Never count it as a measured shopping requirement.
  if (parsed.unit === 'pcs' && !Number.isInteger(scaled)) {
    return { value:displayAmount(scaled, parsed.unit), status:'review', machineMeasure:'' };
  }
  const numeric = String(scaled);
  return { value:displayAmount(scaled, parsed.unit), status:'scaled', machineMeasure:numeric + ' ' + parsed.unit };
}

export function scaledIngredients(meal, base, target) {
  const result=[];
  for(let i=1;i<=20;i++){
    const name=String(meal?.['strIngredient'+i] || '').trim();
    if (!name) continue;
    const measure=String(meal?.['strMeasure'+i] || '').trim();
    result.push({ name, originalMeasure:measure, ...scaleMeasure(measure,base,target) });
  }
  return result;
}

export function plannedIngredients(meal, base, target) {
  return scaledIngredients(meal,base,target).map(x=>({name:x.name,measure:x.machineMeasure}));
}

export function setRecipeServings(entry, servings) {
  // Empty input clears the previously confirmed count, rather than assuming 4.
  if (String(servings ?? '').trim() === '') {
    const { baseServings:ignored, ...rest }=entry;
    return rest;
  }
  const count=validServings(servings);
  if (!count) throw new Error('Enter an original serving count between 1 and 24.');
  return {...entry,baseServings:count};
}

export function resolvePlanServings(entry, dayValue) {
  const base=validServings(entry?.baseServings);
  const planned=validServings(dayValue);
  return base ? (planned || base) : null;
}
