import test from 'node:test';
import assert from 'node:assert/strict';
import {countryAliases,sourceTagCountryHints,sourceTagCategoryHints,
  buildResearchPriority,researchQueueCounts} from '../src/research-priority.js';

const areas=[
  {strCountry:'India',strArea:'Indian'},
  {strCountry:'Bangladesh',strArea:'Bangladeshi'},
  {strCountry:'Dominica',strArea:'Dominican'},
  {strCountry:'Dominican Republic',strArea:'Dominican'}
];
const leads=[
  {id:'wikibooks:1',sourcePageId:101,title:'Vegetable Rice'},
  {id:'wikibooks:2',sourcePageId:102,title:'Dosa'},
  {id:'wikibooks:3',sourcePageId:103,title:'West Indies Curry'},
  {id:'wikibooks:4',sourcePageId:104,title:'Plain Stew'},
  {id:'wikibooks:5',sourcePageId:105,title:'Rice Soup'}
];
const tags=new Map([
  [101,['Indian recipes','Vegetarian dishes','Rice recipes']],
  [102,['Indian cuisine','Breakfast recipes']],
  [103,['West Indian dishes','West Indies recipes']],
  [104,['Traditional dishes']],
  [105,['Bangladeshi recipes','Vegetarian dishes']]
]);

test('exact source-tag matching avoids substrings and shared regional aliases',()=>{
  assert.deepEqual(countryAliases('India',areas),['india','indian']);
  assert.deepEqual(countryAliases('Dominica',areas),['dominica']);
  assert.deepEqual(sourceTagCountryHints(tags.get(103),'India',areas),[]);
  assert.deepEqual(sourceTagCountryHints(tags.get(101),'India',areas),['Indian recipes']);
  assert.deepEqual(sourceTagCountryHints(['Indian-inspired dinner'],'India',areas),[]);
  assert.deepEqual(sourceTagCountryHints(['Indian curries'],'India',areas),[]);
  assert.deepEqual(sourceTagCountryHints(['Dominican recipes'],'Dominica',areas),[]);
  assert.deepEqual(sourceTagCountryHints(['Recipes from Bangladesh'],'Bangladesh',areas),['Recipes from Bangladesh']);
});

test('course matching requires a source tag, not a likely sounding recipe title',()=>{
  assert.deepEqual(sourceTagCategoryHints(tags.get(101),'Vegetarian'),['Vegetarian dishes']);
  assert.deepEqual(sourceTagCategoryHints(tags.get(102),'Vegetarian'),[]);
  assert.deepEqual(sourceTagCategoryHints(['Desserts'],'Dessert'),['Desserts']);
  assert.deepEqual(sourceTagCategoryHints(['Very spicy seafood-like soup'],'Seafood'),[]);
});

test('country plus category focus narrows only research leads and never certifies national origin',()=>{
  const country=buildResearchPriority(leads,tags,{country:'India',category:'Vegetarian',areas,mode:'country'});
  assert.deepEqual(country.map(x=>x.entry.id),['wikibooks:1','wikibooks:2']);
  const both=buildResearchPriority(leads,tags,{country:'India',category:'Vegetarian',areas,mode:'country-category'});
  assert.deepEqual(both.map(x=>x.entry.id),['wikibooks:1']);
  assert.equal(both[0].hintStatus,'unverified-source-tags');
  const summary=researchQueueCounts(leads,tags,{country:'India',category:'Vegetarian',areas});
  assert.deepEqual([summary.total,summary.countryHints,summary.jointHints,summary.verifiedBest],[5,2,1,0]);
  assert.throws(()=>buildResearchPriority(leads,tags,{mode:'certified'}),/Unsupported/);
});

test('unreviewed source candidates are prioritised over already rejected candidates at equal hint quality',()=>{
  const reviews={'wikibooks:1':{status:'rejected'}};
  const first=buildResearchPriority(leads,tags,{
    country:'India',category:'Dessert',areas,mode:'country',reviews});
  assert.deepEqual(first.map(x=>x.entry.id),['wikibooks:2','wikibooks:1']);
  const original=leads.map(x=>x.id);
  assert.deepEqual(leads.map(x=>x.id),original,'sorting never changes the input queue');
});

test('the original 30-per-pair counts cannot be inflated by research hints',()=>{
  const search=buildResearchPriority(leads,tags,{country:'India',category:'Vegetarian',areas,mode:'country-category'});
  assert.equal(search.length,1);
  assert.ok(!Object.hasOwn(search[0],'rank'));
  assert.equal(search[0].hintStatus,'unverified-source-tags');
  assert.equal(researchQueueCounts(leads,tags,{country:'India',category:'Vegetarian',areas}).verifiedBest,0);
});
