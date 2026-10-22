const BASE = 'https://www.themealdb.com/api/json/v1/1/';
const cache = new Map();

async function request(endpoint, params = {}, signal) {
  const url = new URL(endpoint, BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const key = url.toString();
  if (cache.has(key)) return cache.get(key);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Recipe service returned HTTP ' + response.status);
  const json = await response.json();
  if (!json || typeof json !== 'object') throw new Error('Invalid recipe service response');
  cache.set(key, json);
  return json;
}
const asMeals = data => Array.isArray(data?.meals) ? data.meals : [];

export async function featured(signal) {
  return asMeals(await request('search.php', { f: 'b' }, signal)).slice(0, 18);
}
export async function searchMeals(query, signal) {
  return asMeals(await request('search.php', { s: query }, signal));
}
export async function cuisineMeals(area, signal) {
  return asMeals(await request('filter.php', { a: area }, signal)).slice(0, 30);
}
export async function mealDetails(id, signal) {
  const meals = asMeals(await request('lookup.php', { i: id }, signal));
  if (!meals.length) throw new Error('This recipe is no longer available.');
  return meals[0];
}
export async function pantryCandidates(ingredients, signal) {
  const names = [...new Set(ingredients.map(x => x.name.trim()).filter(Boolean))].slice(0, 4);
  if (!names.length) return [];
  const filtered = await Promise.allSettled(names.map(name => request('filter.php', { i: name.replaceAll(' ', '_') }, signal)));
  const unique = new Map();
  for (const result of filtered) {
    if (result.status !== 'fulfilled') continue;
    for (const meal of asMeals(result.value).slice(0, 10)) unique.set(meal.idMeal, meal);
  }
  const shortlisted = [...unique.values()].slice(0, 16);
  if (!shortlisted.length) return [];
  const detailed = await Promise.allSettled(shortlisted.map(meal => mealDetails(meal.idMeal, signal)));
  return detailed.filter(x => x.status === 'fulfilled').map(x => x.value);
}