import test from 'node:test';import assert from 'node:assert/strict';
import {readSelectedRoute,selectedRouteUrl} from '../src/selected-navigation.js';
test('selected recipe filters, rating choice and page round-trip through bookmarks',()=>{
 const route=readSelectedRoute('https://tasteit.test/selected-recipes.html?query=egg&source=goodfood&course=breakfast&sort=rating&rated=0&page=3&collection=world-favourites-100');
 assert.deepEqual(route,{query:'egg',source:'goodfood',course:'breakfast',sort:'rating',ratedOnly:false,page:3,collection:'world-favourites-100'});
 assert.deepEqual(readSelectedRoute(selectedRouteUrl('https://tasteit.test/selected-recipes.html',route)),route);
});
test('invalid values cannot create unknown filters or invalid page ranges',()=>{
 const r=readSelectedRoute('https://tasteit.test/?source=evil&course=nope&sort=x&page=-4&rated=oops&collection=unknown');
 assert.deepEqual(r,{query:'',source:'',course:'',sort:'title',ratedOnly:true,page:1,collection:''});
 assert.equal(readSelectedRoute('https://tasteit.test/?page=2.5').page,1);
 assert.ok(!selectedRouteUrl('https://tasteit.test/?page=4&query=x',{}).includes('?'));
});
