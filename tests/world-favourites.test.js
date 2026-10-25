import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateRecipe,validateWorldFavourites} from '../src/selected-sources.js';
test('the world favourites release adds exactly 100 new rated recipes and retains all original IDs',async()=>{
 const data=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))),collection=JSON.parse(await readFile(new URL('../data/world-favourites-100.json',import.meta.url))),baseline=JSON.parse(await readFile(new URL('./fixtures/selected-source-baseline-ids.json',import.meta.url)));
 assert.equal(baseline.length,36);assert.equal(data.recipes.length,136);assert.equal(new Set(data.recipes.map(x=>x.id)).size,136);assert.equal(new Set(data.recipes.map(x=>x.url)).size,136);data.recipes.forEach(validateRecipe);validateWorldFavourites(collection,data.recipes);
 const ids=new Set(data.recipes.map(x=>x.id));for(const id of baseline){assert.ok(ids.has(id),id);assert.ok(!collection.recipeIds.includes(id),'old recipes do not count toward the100 additions');}
 for(const recipe of data.recipes)for(const key of ['instructions','recipeInstructions','reviews','review'])assert.equal(key in recipe,false);
});
