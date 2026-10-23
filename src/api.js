const BASE = 'https://www.themealdb.com/api/json/v1/1/';
const cache = new Map();
const REQUEST_TIMEOUT_MS = 12_000;

function checkCancelled(signal) {
  if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
}
async function request(endpoint, params = {}, signal, shouldCache = true, {timeoutMs=REQUEST_TIMEOUT_MS} = {}) {
  checkCancelled(signal);
  const url = new URL(endpoint, BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const key = url.toString();
  if (shouldCache && cache.has(key)) return cache.get(key);
  const controller = new AbortController();
  const cancel = () => controller.abort(new DOMException('Request cancelled', 'AbortError'));
  signal?.addEventListener('abort', cancel, {once:true});
  let timer;
  try {
    const deadline = new Promise((_resolve,reject) => {
      controller.signal.addEventListener('abort', () => reject(controller.signal.reason), {once:true});
      timer = setTimeout(() => controller.abort(new Error('Recipe service timed out. Please try again.')),
        Math.max(1,Number(timeoutMs) || REQUEST_TIMEOUT_MS));
    });
    const work = (async () => {
      const response = await fetch(url, {signal:controller.signal});
      if (!response.ok) throw new Error('Recipe service returned HTTP ' + response.status);
      const json = await response.json();
      if (!json || typeof json !== 'object' || !('meals' in json) ||
          (json.meals !== null && !Array.isArray(json.meals))) throw new Error('Invalid recipe service response');
      return json;
    })();
    const json = await Promise.race([work,deadline]);
    checkCancelled(signal);
    if (shouldCache) cache.set(key,json);
    return json;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort',cancel);
  }
}
const asMeals = data => Array.isArray(data?.meals) ? data.meals : [];

async function featuredReport(signal, options) {
  const letters = ['a', 'b', 'c', 'm', 'p', 's'];
  const offset = Math.floor(Date.now() / 86_400_000) % letters.length;
  const selection = [0, 2, 4, 5].map(step => letters[(offset + step) % letters.length]);
  const results = await Promise.allSettled(selection.map(f => request('search.php', { f }, signal,true,options)));
  checkCancelled(signal);
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
  return {meals:[...unique.values()].slice(0,24),partial:successful.length < results.length};
}
export async function featured(signal) { return (await featuredReport(signal)).meals; }
export async function availableAreaRecords(signal) {
  const records=asMeals(await request('list.php',{a:'list'},signal));
  return records.filter(x=>typeof x.strArea==='string' && x.strArea.trim())
    .map(x=>({strArea:x.strArea.trim(),strCountry:typeof x.strCountry==='string'?x.strCountry.trim():''}));
}
export async function availableAreas(signal) {
  return [...new Set((await availableAreaRecords(signal)).map(x=>x.strArea))].sort((a,b)=>a.localeCompare(b));
}
export async function availableCategories(signal) {
  const values=asMeals(await request('list.php',{c:'list'},signal))
    .map(x=>String(x.strCategory||'').trim()).filter(Boolean);
  return [...new Set(values)].sort((a,b)=>a.localeCompare(b));
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

// Mandatory filters use full source ID sets, including summary-only records.
// Do not intersect already truncated lists or infer missing cuisine/category fields.
export async function discoverMeals({query='',area='',category='',letter=''} = {}, signal, options) {
  checkCancelled(signal);
  const jobs = {};
  if (area && area !== 'All') jobs.area = request('filter.php',{a:area},signal,true,options);
  if (category && category !== 'All') jobs.category = request('filter.php',{c:category},signal,true,options);
  if (query) jobs.base = request('search.php',{s:query},signal,true,options);
  else if (letter) jobs.base = request('search.php',{f:letter.toLowerCase()},signal,true,options);
  const entries = Object.entries(jobs);
  const values = await Promise.all(entries.map(async ([key,value])=>[key,asMeals(await value)]));
  checkCancelled(signal);
  const lists = Object.fromEntries(values);
  const report = lists.base || lists.area || lists.category;
  if (!report) return featuredReport(signal,options);
  let meals = report;
  for (const key of ['area','category']) {
    if (!lists[key]) continue;
    const ids = new Set(lists[key].map(x=>String(x.idMeal)));
    meals = meals.filter(x=>ids.has(String(x.idMeal)));
  }
  if (letter) meals = meals.filter(x=>String(x.strMeal||'').toLocaleLowerCase().startsWith(letter.toLowerCase()));
  return {meals,partial:false};
}
export async function pantryCandidateReport(ingredients, signal) {
  checkCancelled(signal);
  const names = [...new Set(ingredients.map(x=>x.name.trim()).filter(Boolean))].slice(0,4);
  if (!names.length) return {meals:[],partial:false};
  const filtered = await Promise.allSettled(names.map(name=>request('filter.php',{i:name.replaceAll(' ','_')},signal)));
  checkCancelled(signal);
  const successful = filtered.filter(x=>x.status==='fulfilled');
  if (!successful.length) throw new Error('Recipe service unavailable');
  const unique = new Map();
  for (const result of successful) {
    for (const meal of asMeals(result.value).slice(0,10)) unique.set(meal.idMeal,meal);
  }
  const shortlist = [...unique.values()].slice(0,16);
  if (!shortlist.length) return {meals:[],partial:successful.length<filtered.length};
  const detailed = await Promise.allSettled(shortlist.map(meal=>mealDetails(meal.idMeal,signal)));
  checkCancelled(signal);
  const meals = detailed.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if (!meals.length) throw new Error('Recipe service unavailable');
  return {meals,partial:successful.length<filtered.length || meals.length<shortlist.length};
}
export async function pantryCandidates(ingredients,signal) {
  return (await pantryCandidateReport(ingredients,signal)).meals;
}
export async function letterMeals(letter, signal) {
  if (!/^[a-z]$/i.test(String(letter || ''))) throw new Error('Choose a letter from A to Z.');
  return asMeals(await request('search.php', { f: String(letter).toLowerCase() }, signal));
}
export async function randomMeal(signal) {
  const meals = asMeals(await request('random.php', {}, signal, false));
  if (!meals.length) throw new Error('No surprise recipe was returned.');
  return meals[0];
}

// Provider V1 offers a recipe-by-initial endpoint. Scan it cautiously when
// the user explicitly requests a worldwide index; never start 26 requests
// on normal homepage load. A failed letter is reported, not called complete.
export async function scanWorldRecipes({getLetter=letterMeals,letters='abcdefghijklmnopqrstuvwxyz'.split(''),
  signal,onProgress=()=>{},concurrency=3}={}) {
  const uniqueLetters=[...new Set(letters.map(x=>String(x).toLowerCase()))];
  if(!uniqueLetters.length || uniqueLetters.some(x=>!/^[a-z]$/.test(x))) throw new Error('Invalid scan letters.');
  const limit=Math.max(1,Math.min(4,Math.floor(concurrency)||1));
  const data=new Array(uniqueLetters.length);
  const failures=[];
  let cursor=0,done=0;
  async function worker(){
    while(cursor<uniqueLetters.length){
      if(signal?.aborted) throw new DOMException('Cancelled scan','AbortError');
      const index=cursor++;
      const letter=uniqueLetters[index];
      try { data[index]=await getLetter(letter,signal); }
      catch(error) {
        if(signal?.aborted || error?.name==='AbortError') throw error;
        failures.push(letter);
        data[index]=[];
      }
      done++;
      onProgress({completed:done,total:uniqueLetters.length,letter,
        recipes:data.reduce((n,x)=>n+(x?.length||0),0),failed:failures.length});
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,uniqueLetters.length)},worker));
  if(signal?.aborted) throw new DOMException('Cancelled scan','AbortError');
  return {meals:data.flat(),failedLetters:failures.sort(),completed:done,total:uniqueLetters.length};
}
