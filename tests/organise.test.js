import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseTag,tagsOf,addTag,removeTag,collectionTags,filterCookbook } from '../src/organise.js';

const saved = {
  '1': {meal:{strMeal:'Chicken curry',strArea:'Bangladeshi'},wanted:true,tags:['Weeknight','Family']},
  '2': {meal:{strMeal:'Chana masala',strArea:'Indian'},usual:true,cookedCount:8,lastCooked:'2026-10-20T12:00:00Z',tags:['Weeknight']},
  '3': {meal:{strMeal:'Pasta',strArea:'Italian'},favourite:true,cookedCount:1,lastCooked:'2026-08-01T12:00:00Z',tags:[]}
};
test('normalises and limits personal tags without mutating entries',()=>{
  const entry={meal:{strMeal:'Rice'},wanted:true,tags:['Weeknight']};
  const updated=addTag(entry,'   family   favourite  ');
  assert.deepEqual(updated.tags,['Weeknight','family favourite']);
  assert.deepEqual(entry.tags,['Weeknight']);
  assert.deepEqual(addTag(updated,'FAMILY FAVOURITE').tags,updated.tags);
  assert.deepEqual(removeTag(updated,'FAMILY FAVOURITE').tags,['Weeknight']);
  assert.equal(normaliseTag('  weekend  meal  '),'weekend meal');
  assert.throws(()=>addTag(entry,'x'.repeat(31)),/1–30/);
  assert.throws(()=>addTag(entry,'\n'),/1–30/);
  assert.throws(()=>addTag({...entry,tags:Array.from({length:12},(_,i)=>'Tag '+i)},'Another'),/12 tags/);
  assert.deepEqual(tagsOf({tags:[null,12,'','Weekend']}),['Weekend']);
});
test('indexes labels without guessing preferences or altering recipe sources',()=>{
  assert.deepEqual(collectionTags(saved),[{name:'Family',count:1},{name:'Weeknight',count:2}]);
  assert.equal(filterCookbook(saved,{tag:'weeknight'}).length,2);
  assert.deepEqual(filterCookbook(saved,{collection:'favourite'}).map(x=>x.meal.strMeal),['Pasta']);
  assert.deepEqual(filterCookbook(saved,{query:'bangla'}).map(x=>x.meal.strMeal),['Chicken curry']);
  assert.deepEqual(filterCookbook(saved,{query:'Family'}).map(x=>x.meal.strMeal),['Chicken curry']);
  assert.deepEqual(filterCookbook(saved,{sort:'recent'}).map(x=>x.meal.strMeal),['Chana masala','Pasta','Chicken curry']);
  assert.deepEqual(filterCookbook(saved,{sort:'most-cooked'}).map(x=>x.meal.strMeal),['Chana masala','Pasta','Chicken curry']);
  assert.equal(filterCookbook({...saved,'4':{meal:{strMeal:'Hidden'}}}).length,3);
});
