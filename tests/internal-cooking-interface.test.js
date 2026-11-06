import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('publisher source links are secondary while in-app cooking remains prominent',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const catalogue=await readFile(new URL('../src/selected-recipes-app.js',import.meta.url),'utf8');
 assert.match(app,/data-action="internal-recipes"/);
 assert.match(app,/Sources &amp; credits/);
 assert.match(app,/recipe-provenance/);
 assert.match(app,/Add your own cooking steps below/);
 assert.doesNotMatch(app,/Open original cooking method/);
 assert.match(catalogue,/Open in TasteIt/);
 assert.match(catalogue,/Publisher reference/);
});
