/**
 * Local, read-only inventory of approved ingredient-photo coverage.
 * A missing picture is a research gap, never permission to guess a thumbnail.
 */
import {readFile} from 'node:fs/promises';
import {createIngredientPhotoMatcher} from '../src/ingredient-photos.js';

const read=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
const photos=(await read('../data/ingredient-photos.json')).photos;
const [publisher,licensed]=await Promise.all([
 read('../data/selected-recipes.json'),read('../data/complete-recipes.json')
]);
if(!Array.isArray(photos)||!Array.isArray(publisher.recipes)||!Array.isArray(licensed.recipes))throw Error('Missing recipe/photo registry');
const matcher=createIngredientPhotoMatcher(photos);
const results={},used=new Set(),missing=new Map();
function missingKey(line) {
 return String(line).normalize('NFKC').toLowerCase()
  .replace(/^\s*(?:[0-9¼½¾⅓⅔⅛⅜⅝⅞.,\/\s-]+\s*)?(?:(?:cups?|tbsps?|tablespoons?|tsps?|teaspoons?|grams?|g|kg|ml|l|ounces?|oz|lbs?|pounds?|pieces?|cloves?)\s+)?/i,'')
  .replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim().slice(0,120);
}
for(const [source,rows] of [['publisher',publisher.recipes],['licensed',licensed.recipes]]) {
 const stats={recipes:rows.length,totalIngredients:0,photoMatched:0,missing:0,uniqueMatchedPhotos:new Set()};
 for(const recipe of rows)for(const ingredient of recipe.ingredients) {
  const line=String(ingredient);
  stats.totalIngredients++;
  const hit=matcher(line);
  if(hit) {stats.photoMatched++;stats.uniqueMatchedPhotos.add(hit.id);used.add(hit.id);}
  else {
   stats.missing++;
   const key=missingKey(line)||line.toLowerCase();
   const entry=missing.get(key)||{ingredient:key,count:0,example:line,source};
   entry.count++;
   missing.set(key,entry);
  }
 }
 results[source]={recipes:stats.recipes,ingredients:stats.totalIngredients,matched:stats.photoMatched,missing:stats.missing,coveragePercent:Math.round(10000*stats.photoMatched/Math.max(1,stats.totalIngredients))/100,uniqueMatchedPhotos:stats.uniqueMatchedPhotos.size};
}
const topMissing=[...missing.values()].sort((a,b)=>b.count-a.count||a.ingredient.localeCompare(b.ingredient)).slice(0,40);
console.log('TasteIt ingredient-photo coverage:',JSON.stringify({registryPhotos:photos.length,usedPhotoIds:used.size,byCollection:results},null,2));
console.log('Most common unpictured ingredient lines (review before any photo addition):');
for(const item of topMissing)console.log(`  ${String(item.count).padStart(4)} × ${item.ingredient} [e.g. ${item.example.slice(0,100)}]`);
