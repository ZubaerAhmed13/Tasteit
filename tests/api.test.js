import test from 'node:test';
import assert from 'node:assert/strict';
import { featured, availableAreas, availableAreaRecords, availableCategories, scanWorldRecipes, pantryCandidates, searchMeals, cuisineMeals, categoryMeals, letterMeals, randomMeal } from '../src/api.js';

test('recipe API combines diverse initial results, dedupes, lists cuisines and resolves ingredient candidates', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  try {
    globalThis.fetch = async input => {
      const u = new URL(String(input));
      requests.push(u.toString());
      const endpoint = u.pathname.split('/').pop();
      let meals;
      if (endpoint === 'list.php') {
        meals = u.searchParams.has('c')
          ? [{strCategory:'Seafood'}, {strCategory:'Dessert'}, {strCategory:'Seafood'}]
          : [{strArea:'Italian',strCountry:'Italy'}, {strArea:'Bangladeshi',strCountry:'Bangladesh'}, {strArea:'Italian',strCountry:'Italy'}, {strArea:''}];
      } else if (endpoint === 'search.php') {
        const f = u.searchParams.get('f');
        meals = f ? [
          {idMeal:f+'-1',strMeal:'Meal '+f},
          {idMeal:'shared',strMeal:'Common meal'}
        ] : [{idMeal:'search-1',strMeal:'Rice'}];
      } else if (endpoint === 'filter.php') {
        meals = u.searchParams.has('i')
          ? [{idMeal:'1',strMeal:'Ingredient dish'},{idMeal:'1',strMeal:'Ingredient dish'}]
          : [{idMeal:'2',strMeal:'Area dish'}];
      } else if (endpoint === 'random.php') {
        meals = [{idMeal:'random-'+requests.length,strMeal:'Surprise dish'}];
      } else if (endpoint === 'lookup.php') {
        meals = [{idMeal:'1',strMeal:'Ingredient dish',strIngredient1:'Rice',strMeasure1:'1 cup'}];
      } else {
        throw new Error('Unexpected API call: '+u.toString());
      }
      return { ok:true, json:async()=>({meals}) };
    };
    const set = await featured();
    assert.equal(set.length,5,'four different letters plus one shared result');
    assert.equal(new Set(set.map(m=>m.idMeal)).size,set.length);
    assert.equal(requests.filter(x=>x.includes('search.php?f=')).length,4);
    assert.deepEqual(await availableAreas(),['Bangladeshi','Italian']);
    assert.equal((await availableAreaRecords())[0].strCountry,'Italy');
    assert.deepEqual(await availableCategories(),['Dessert','Seafood']);
    assert.equal((await categoryMeals('Seafood'))[0].strMeal,'Area dish');
    assert.equal((await searchMeals('rice'))[0].strMeal,'Rice');
    assert.equal((await cuisineMeals('Italian'))[0].strMeal,'Area dish');
    assert.equal((await letterMeals('Z'))[0].strMeal,'Meal z');
    assert.ok(requests.some(x=>x.includes('search.php?f=z')));
    await assert.rejects(letterMeals('too long'),/Choose a letter/);
    const firstRandom=await randomMeal();
    const secondRandom=await randomMeal();
    assert.notEqual(firstRandom.idMeal,secondRandom.idMeal,'surprise should refetch rather than cache random output');
    assert.equal(requests.filter(x=>x.endsWith('random.php')).length,2);
    const results = await pantryCandidates([{name:'Rice'},{name:'Onion'}]);
    assert.equal(results.length,1);
    assert.equal(results[0].strIngredient1,'Rice');
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('world scan limits concurrency and reports failed provider letters rather than claiming complete coverage',async()=>{
  const starts=[];
  let running=0,peak=0;
  const progress=[];
  const source=async letter=>{
    running++;peak=Math.max(peak,running);
    starts.push(letter);
    await new Promise(resolve=>setTimeout(resolve,1));
    running--;
    if(letter==='b')throw new Error('Provider down for letter b');
    return [{idMeal:letter,strMeal:'Meal '+letter}];
  };
  const report=await scanWorldRecipes({
    getLetter:source,letters:['a','b','c','d','e'],concurrency:2,
    onProgress:x=>progress.push(x)
  });
  assert.equal(peak<=2,true);
  assert.deepEqual(report.failedLetters,['b']);
  assert.equal(report.completed,5);
  assert.equal(report.meals.length,4);
  assert.equal(progress.length,5);
  assert.equal(progress.at(-1).failed,1);
  await assert.rejects(scanWorldRecipes({letters:['?'],getLetter:source}),/Invalid scan letters/);
});
