import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('offline shell contains source and complete collections and verifies standalone HTML',async()=>{
 const worker=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 const page=await readFile(new URL('../selected-recipes.html',import.meta.url),'utf8');
 for(const path of ['selected-recipes.html','selected-recipes.css','data/complete-recipes.json','data/selected-recipes.json','data/world-favourites-100.json'])
  assert.ok(worker.includes("'./"+path+"'"),path+' must be in the verified offline shell');
 assert.match(page,/<meta name="application-name" content="Tasteit">/);
});
