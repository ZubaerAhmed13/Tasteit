import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import * as presentation from '../src/recipe-presentation.js';
const records=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))).recipes;
test('shared publisher presentation preserves genuine score, count kind and unknown rating',()=>{
 const r=records.find(r=>r.rating?.countType==='ratings');const html=presentation.recipeRatingMarkup(r);assert.ok(html.includes(String(r.rating.value)));assert.ok(html.includes('rating votes'));assert.ok(html.includes('Publisher rating'));
 const review={...r,rating:{...r.rating,countType:'reviews'}};assert.ok(presentation.recipeRatingMarkup(review).includes('reviews'));assert.ok(!presentation.recipeRatingMarkup(review).includes('rating votes'));
 assert.ok(presentation.recipeRatingMarkup({...r,rating:null}).includes('Rating not collected'));assert.equal(presentation.recipeRatingMarkup(null),'');
 assert.ok(!presentation.recipeRatingMarkup({...r,rating:{...r.rating,count:null}}).includes('null'));
});
