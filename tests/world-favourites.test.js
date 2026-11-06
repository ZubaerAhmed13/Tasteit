import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateRecipe,validateWorldFavourites} from '../src/selected-sources.js';
test('the world favourites release adds exactly 100 new rated recipes and retains all original IDs',async()=>{
 const data=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))),collection=JSON.parse(await readFile(new URL('../data/world-favourites-100.json',import.meta.url))),baseline=JSON.parse(await readFile(new URL('./fixtures/selected-source-baseline-ids.json',import.meta.url)));
 assert.equal(baseline.length,36);assert.ok(data.recipes.length>=1008);assert.ok(data.recipes.filter(r=>r.rating).length>=1000);assert.equal(new Set(data.recipes.map(x=>x.id)).size,data.recipes.length);assert.equal(new Set(data.recipes.map(x=>x.url)).size,data.recipes.length);data.recipes.forEach(validateRecipe);validateWorldFavourites(collection,data.recipes);
 const ids=new Set(data.recipes.map(x=>x.id));for(const id of baseline){assert.ok(ids.has(id),id);assert.ok(!collection.recipeIds.includes(id),'old recipes do not count toward the100 additions');}
 const preserved=JSON.parse(await readFile(new URL('./fixtures/selected-source-preserved-136.json',import.meta.url)));assert.equal(Object.keys(preserved).length,136);
 for(const [id,hash]of Object.entries(preserved)){const recipe=data.recipes.find(r=>r.id===id);assert.ok(recipe,id);assert.equal(createHash('sha256').update(JSON.stringify(recipe)).digest('hex'),hash,id);}
 for(const recipe of data.recipes.filter(r=>!preserved[r.id])){assert.ok(recipe.rating?.count>=4);assert.ok(recipe.rating.value/recipe.rating.best>=0.8);assert.ok(recipe.photoUrl);}
 for(const recipe of data.recipes)for(const key of ['instructions','recipeInstructions','reviews','review'])assert.equal(key in recipe,false);
});
