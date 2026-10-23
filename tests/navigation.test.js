import test from 'node:test';
import assert from 'node:assert/strict';
import * as navigation from '../src/navigation.js';

test('static-host URLs round-trip composed filters and recipe links',()=>{
  const url=navigation.routeUrl({view:'discover',query:'Chicken & rice',area:'Indian',category:'Chicken',letter:'C',recipe:'52772'},'https://tasteit.test/my/app/?utm_source=test');
  assert.equal(url.pathname,'/my/app/');
  assert.equal(url.searchParams.get('utm_source'),'test');
  assert.deepEqual(navigation.readRoute(url),{
    view:'discover',query:'Chicken & rice',area:'Indian',category:'Chicken',letter:'C',kitchen:false,recipe:'52772'});
});
test('invalid routes fall back safely and normalise empty filter choices',()=>{
  assert.deepEqual(navigation.readRoute('https://tasteit.test/?view=bad&letter=XYZ&recipe=../../evil&cuisine=All'),{
    view:'discover',query:'',area:'',category:'',letter:'',kitchen:false,recipe:''});
  assert.deepEqual(navigation.normaliseFilters({query:'  rice  ',area:'All',category:'Dessert',letter:'b'}),{
    query:'rice',area:'',category:'Dessert',letter:'B'});
});
test('view, private recipe links and kitchen mode persist without exposing pantry names',()=>{
  const url=navigation.routeUrl({view:'library',recipe:'personal-abc-123',kitchen:true},'https://tasteit.test/app/');
  assert.equal(navigation.readRoute(url).view,'library');
  assert.equal(navigation.readRoute(url).recipe,'personal-abc-123');
  assert.equal(navigation.readRoute(url).kitchen,true);
  assert.equal(url.searchParams.get('mode'),'kitchen');
});
test('current filter summary supports removing one filter without clearing the others',()=>{
  assert.deepEqual(navigation.filterSummary({query:'Rice',area:'Indian',category:'Vegetarian',letter:'R'}),[
    {key:'query',label:'Name: Rice'},{key:'area',label:'Cuisine: Indian'},
    {key:'category',label:'Type: Vegetarian'},{key:'letter',label:'Starts with R'}]);
});
