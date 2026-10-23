import test from 'node:test';
import assert from 'node:assert/strict';
import { featured, availableAreas, availableCategories, pantryCandidates, searchMeals, cuisineMeals, categoryMeals, letterMeals, randomMeal } from '../src/api.js';

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
          : [{strArea:'Italian'}, {strArea:'Bangladeshi'}, {strArea:'Italian'}, {strArea:''}];
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
