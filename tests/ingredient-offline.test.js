import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {recipeIngredientPhotoUrls,saveRecipeIngredientPhotos} from '../src/ingredient-offline.js';
const registry=JSON.parse(await readFile('data/ingredient-photos.json','utf8')).photos;
test('offline photo selection deduplicates reviewed exact ingredients and excludes unsafe substitutions',()=>{
 const urls=recipeIngredientPhotoUrls(['1 onion','2 onions','1 clove garlic','unknown fictitious food','ginger garlic paste'],registry);
 const onion=registry.find(p=>p.id==='onion');
 const garlic=registry.find(p=>p.id==='garlic');
 assert.deepEqual(new Set(urls),new Set([onion.url,garlic.url]));
 assert.equal(recipeIngredientPhotoUrls(['unknown fictitious food'],registry).length,0);
});
test('client saves selected photos through a message channel and reports partial failures',async()=>{
 class Channel{
  constructor(){this.port1={onmessage:null,close(){}};this.port2={reply:msg=>this.port1.onmessage({data:msg})};}
 }
 let sent;
 const worker={postMessage(message,[port]){sent=message;port.reply({ok:true,saved:0,failed:message.urls.length});}};
 const result=await saveRecipeIngredientPhotos(['onion','garlic'],registry,{worker,Channel,timeoutMs:250});
 assert.equal(sent.type,'TASTEIT_CACHE_RECIPE_PHOTOS');
 assert.deepEqual(new Set(sent.urls),new Set(recipeIngredientPhotoUrls(['onion','garlic'],registry)));
 assert.deepEqual(result,{requested:2,saved:0,failed:2});
 await assert.rejects(saveRecipeIngredientPhotos(['onion'],registry,{worker:null,Channel}),/not ready/);
});
