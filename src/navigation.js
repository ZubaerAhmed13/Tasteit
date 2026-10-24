const VIEWS = new Set(['discover','world','library','pantry','plan']);
const text = (value,max=100) => String(value ?? '').trim().slice(0,max);
export function normaliseFilters(input={}) {
  const choice = value => text(value,80) === 'All' ? '' : text(value,80);
  const letter=text(input.letter,10).toUpperCase();
  return {query:text(input.query),area:choice(input.area),category:choice(input.category),
    letter:/^[A-Z]$/.test(letter)?letter:''};
}
function normaliseRoute(input={}) {
  const recipe=text(input.recipe,128);
  return {view:VIEWS.has(input.view)?input.view:'discover',...normaliseFilters(input),
    kitchen:input.kitchen===true,recipe:/^[A-Za-z0-9_-]+$/.test(recipe)?recipe:''};
}
export function readRoute(input) {
  const url=new URL(String(input));
  const p=url.searchParams;
  return normaliseRoute({view:p.get('view'),query:p.get('q'),area:p.get('cuisine'),
    category:p.get('category'),letter:p.get('letter'),kitchen:p.get('mode')==='kitchen',recipe:p.get('recipe')});
}
export function routeUrl(input,base) {
  const route=normaliseRoute(input);
  const url=new URL(String(base));
  const fields={view:route.view==='discover'?'':route.view,q:route.query,cuisine:route.area,
    category:route.category,letter:route.letter,mode:route.kitchen?'kitchen':'',recipe:route.recipe};
  for(const [key,value] of Object.entries(fields)) {
    if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);
  }
  return url;
}
export function filterSummary(input) {
  const filters=normaliseFilters(input);
  return [['query','Name: '],['area','Cuisine: '],['category','Type: '],['letter','Starts with ']]
    .filter(([key])=>filters[key]).map(([key,prefix])=>({key,label:prefix+filters[key]}));
}
