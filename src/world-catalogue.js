// Country × provider-category curation. A provider label is NOT independent
// evidence of cultural origin, and "well documented" is NOT "best reviewed".
export const CATALOGUE_TARGET=30;
export const SCAN_LETTERS='abcdefghijklmnopqrstuvwxyz'.split('');
const norm = x=>String(x||'').normalize('NFKC').trim().toLocaleLowerCase('en');

export function countryDirectory(areas=[]) {
  const byCountry=new Map();
  for(const record of areas) {
    const country=String(record?.strCountry || '').trim();
    const area=String(record?.strArea || '').trim();
    if(!country || !area) continue;
    const key=norm(country);
    if(!byCountry.has(key)) byCountry.set(key,{country,areas:[]});
    if(!byCountry.get(key).areas.includes(area)) byCountry.get(key).areas.push(area);
  }
  return [...byCountry.values()].sort((a,b)=>a.country.localeCompare(b.country));
}
export function documentedRecipeScore(meal) {
  let points=0;
  const instruction=String(meal?.strInstructions || '').trim();
  if(instruction.length>=80) points+=30;
  else if(instruction.length>=20) points+=12;
  const ingredients=Array.from({length:20},(_,i)=>String(meal?.['strIngredient'+(i+1)]||'').trim()).filter(Boolean);
  if(ingredients.length>=5) points+=20;
  else if(ingredients.length>=2) points+=10;
  const measured=ingredients.filter((_,i)=>String(meal?.['strMeasure'+(i+1)]||'').trim()).length;
  points+=Math.min(10,measured*2);
  if(/^https:\/\//i.test(String(meal?.strSource||''))) points+=20;
  if(/^https:\/\//i.test(String(meal?.strYoutube||''))) points+=10;
  if(/^https:\/\//i.test(String(meal?.strMealThumb||''))) points+=10;
  return Math.min(100,points);
}
export function catalogueFromProvider(meals,areas,categoryNames,target=CATALOGUE_TARGET) {
  if(!Number.isSafeInteger(target)||target<1||target>100) throw new Error('Invalid catalogue target');
  const countries=countryDirectory(areas);
  const regionOwners=new Map();
  for(const record of countries) {
    for(const area of record.areas) {
      const key=norm(area);
      if(!regionOwners.has(key)) regionOwners.set(key,new Set());
      regionOwners.get(key).add(record.country);
    }
  }
  const categories=[...new Set(categoryNames.map(String).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const listed=new Map(countries.map(c=>[c.country,new Map(categories.map(cat=>[cat,[]]))]));
  const categoriesByNorm=new Map(categories.map(x=>[norm(x),x]));
  const unique=new Set();
  let duplicates=0, ambiguous=0, unclassified=0;
  for(const meal of meals) {
    const id=String(meal?.idMeal || '').trim();
    if(!id) {unclassified++;continue;}
    if(unique.has(id)){duplicates++;continue;}
    unique.add(id);
    const category=categoriesByNorm.get(norm(meal.strCategory));
    const explicitCountry=norm(meal.strCountry);
    const knownCountry= countries.find(c=>norm(c.country)===explicitCountry);
    const possibleCountries=regionOwners.get(norm(meal.strArea));
    // Ambiguous area labels (e.g. "Dominican") must not silently assign
    // a recipe to multiple countries. An explicit country field can resolve it.
    const country=knownCountry?.country || (possibleCountries?.size===1 ? [...possibleCountries][0]:null);
    if(!country || !category) {
      if(possibleCountries?.size>1 && !knownCountry) ambiguous++;
      else unclassified++;
      continue;
    }
    listed.get(country).get(category).push({
      id,meal,providerArea:String(meal.strArea||''),category,country,
      documentationScore:documentedRecipeScore(meal),
      editorialStatus:'not-reviewed',
      imageCredit:meal.strMealThumb ? 'TheMealDB community photo; reuse rights not independently verified':null
    });
  }
  let nonempty=0, full=0, totalFound=0;
  const cells=new Map();
  for(const [country,perCategory] of listed) {
    const data=new Map();
    for(const [category,candidates] of perCategory) {
      candidates.sort((a,b)=>b.documentationScore-a.documentationScore ||
        String(a.meal.strMeal).localeCompare(String(b.meal.strMeal)));
      const selected=candidates.slice(0,target);
      if(selected.length) nonempty++;
      if(selected.length>=target) full++;
      totalFound+=selected.length;
      data.set(category,{
        country,category,count:selected.length,available:candidates.length,
        target,missing:Math.max(0,target-selected.length),
        reviewed:0,status:selected.length>=target?'target-met':'needs-sources',
        recipes:selected
      });
    }
    cells.set(country,data);
  }
  return {countries,categories,cells,
    stats:{countries:countries.length,categories:categories.length,
      combinations:countries.length*categories.length,
      nonempty,full,totalFound,duplicates,ambiguous,unclassified,
      scanned:meals.length}
  };
}
export function catalogueCell(catalogue,country,category) {
  return catalogue?.cells.get(country)?.get(category) || null;
}
export function exportCatalogueIndex(catalogue,{source='TheMealDB V1',scannedAt=new Date().toISOString()}={}) {
  // Metadata only; never redistribute remote recipe instructions or image bytes.
  return {
    version:1,source,scannedAt,targetPerCountryCategory:CATALOGUE_TARGET,
    status:'provider-candidates-not-editorially-verified',stats:catalogue.stats,
    cells:[...catalogue.cells.values()].flatMap(per=>[...per.values()]
      .filter(cell=>cell.available>0).map(cell=>({
        country:cell.country,category:cell.category,available:cell.available,
        count:cell.count,missing:cell.missing,recipeIds:cell.recipes.map(x=>x.id)
      })))
  };
}
