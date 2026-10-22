import { analyseMeal, normalizeIngredient, usablePantryItem } from './model.js';

// A batch is one physical purchase/container. Different batches of the same
// ingredient remain separate so expiry and locations are never lost.
export function dateStatus(iso, now = new Date()) {
  if (!iso) return { kind:'unknown', days:null, label:'No date recorded' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { kind:'invalid', days:null, label:'Check date' };
  const date = new Date(iso + 'T12:00:00');
  if (!Number.isFinite(date.getTime()) || Number.isNaN(date.valueOf()) ||
      date.getFullYear() !== Number(iso.slice(0,4)) ||
      date.getMonth() + 1 !== Number(iso.slice(5,7)) ||
      date.getDate() !== Number(iso.slice(8,10))) {
    return { kind:'invalid', days:null, label:'Check date' };
  }
  const start = Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  const end = Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
  const days = Math.round((end - start) / 86400000);
  if (days < 0) return {kind:'past',days,label:'Past date by ' + Math.abs(days) + ' day' + (days < -1 ? 's' : '')};
  if (days === 0) return {kind:'soon',days,label:'Dated today'};
  if (days <= 3) return {kind:'soon',days,label:'Dated in ' + days + ' day' + (days > 1 ? 's' : '')};
  return {kind:'future',days,label:'Dated ' + iso};
}
export function expiringBatches(pantry, now = new Date(), horizonDays = 3) {
  return pantry.filter(item => usablePantryItem(item, now))
    .map(item => ({...item, dateInfo:dateStatus(item.expiry, now)}))
    .filter(item => item.dateInfo.days !== null &&
      item.dateInfo.days >= 0 && item.dateInfo.days <= horizonDays)
    .sort((a,b)=>a.dateInfo.days - b.dateInfo.days || a.name.localeCompare(b.name));
}
export function recipeUseSoon(meal, pantry, now = new Date()) {
  const soon = new Set(expiringBatches(pantry, now).map(x=>normalizeIngredient(x.name)));
  const found = new Map();
  const analysis = analyseMeal(meal,pantry);
  for (const ingredient of analysis.availability) {
    const key = normalizeIngredient(ingredient.name);
    if (soon.has(key) && !found.has(key)) found.set(key,ingredient.name);
  }
  return [...found.values()];
}
export function rankByKitchen(meals,pantry,now=new Date()) {
  return [...meals].sort((a,b)=>{
    const score=meal=>{
      const analysis=analyseMeal(meal,pantry);
      const urgency=recipeUseSoon(meal,pantry,now).length;
      return (analysis.isQuantityConfirmed ? 1000 : 0) + analysis.percent*2 + urgency*30;
    };
    return score(b)-score(a) || String(a.strMeal || '').localeCompare(String(b.strMeal || ''));
  });
}
