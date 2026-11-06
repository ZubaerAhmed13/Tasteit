import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readRoute} from '../src/navigation.js';
test('publisher-only page links to the real complete collection, not an empty source filter',async()=>{
 const html=await readFile(new URL('../selected-recipes.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../src/selected-recipes-app.js',import.meta.url),'utf8');
 assert.match(html,/href="\.\/\?source=wikibooks"/);
 assert.equal(readRoute('https://tasteit.test/?source=wikibooks').source,'wikibooks');
 assert.match(app,/if\(!count\)continue;/,'zero-result publisher sources are not offered as filters');
});
