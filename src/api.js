const BASE = 'https://www.themealdb.com/api/json/v1/1/';
const cache = new Map();

async function request(endpoint, params = {}, signal, shouldCache = true) {
  const url = new URL(endpoint, BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const key = url.toString();
  if (shouldCache && cache.has(key)) return cache.get(key);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Recipe service returned HTTP ' + response.status);
  const json = await response.json();
  if (!json || typeof json !== 'object') throw new Error('Invalid recipe service response');
  if (shouldCache) cache.set(key, json);
  return json;
}
const asMeals = data => Array.isArray(data?.meals) ? data.meals : [];

export async function featured(signal) {
  // Browse several starting letters, rather than presenting only 'B' dishes as a global catalogue.
  const letters = ['a', 'b', 'c', 'm', 'p', 's'];
  const offset = Math.floor(Date.now() / 86_400_000) % letters.length;
  const selection = [0, 2, 4, 5].map(step => letters[(offset + step) % letters.length]);
  const results = await Promise.allSettled(selection.map(f => request('search.php', { f }, signal)));
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
  const successful = results.filter(x => x.status === 'fulfilled');
  if (!successful.length) throw new Error('Recipe service unavailable');
  const groups = successful.map(x => asMeals(x.value).slice(0, 7));
  const unique = new Map();
  for (let index = 0; index < 7; index += 1) {
    for (const group of groups) {
      const meal = group[index];
      if (meal?.idMeal) unique.set(meal.idMeal, meal);
    }
  }
  return [...unique.values()].slice(0, 24);
}
export async function availableAreas(signal) {
  const areas = asMeals(await request('list.php', { a: 'list' }, signal))
    .map(x => String(x.strArea || '').trim()).filter(Boolean);
  return [...new Set(areas)].sort((a,b) => a.localeCompare(b));
}
export async function availableCategories(signal) {
  const categories = asMeals(await request('list.php', { c: 'list' }, signal))
    .map(x => String(x.strCategory || '').trim()).filter(Boolean);
  return [...new Set(categories)].sort((a,b) => a.localeCompare(b));
}
export async function categoryMeals(category, signal) {
  return asMeals(await request('filter.php', { c: category }, signal)).slice(0, 30);
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
export async function letterMeals(letter, signal) {
  if (!/^[a-z]$/i.test(String(letter || ''))) throw new Error('Choose a letter from A to Z.');
  return asMeals(await request('search.php', { f: String(letter).toLowerCase() }, signal));
}

export async function randomMeal(signal) {
  // A random endpoint must never be reused from the ordinary request cache.
  const meals = asMeals(await request('random.php', {}, signal, false));
  if (!meals.length) throw new Error('No surprise recipe was returned.');
  return meals[0];
}
