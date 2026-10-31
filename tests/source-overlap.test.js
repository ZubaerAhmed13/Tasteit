import test from 'node:test';
import assert from 'node:assert/strict';
import {recipeNameKey,recipeTitleIndex,possibleSourceMatches,
  sourceOverlapReport,sourceOverlapCsv} from '../src/source-overlap.js';
const records={
  cells:[
    {country:'India',category:'Chicken',recipes:[
      {id:'100',name:'Chicken Biryani'},
      {id:'101',name:'Chicken Masala Curry'},
      {id:'102',name:'Vegetable stew'}
    ]},
    {country:'Bangladesh',category:'Chicken',recipes:[
      {id:'100',name:'Chicken Biryani'}
    ]}
  ]
};
test('conservatively normalises casing punctuation and accents without stripping food words',()=>{
  assert.equal(recipeNameKey('  Crème brûlée  '),'creme brulee');
  assert.equal(recipeNameKey("Chef's Chicken & Rice"),'chefs chicken and rice');
  assert.notEqual(recipeNameKey('Chicken Biryani'),recipeNameKey('Vegetable Biryani'));
  const index=recipeTitleIndex(records);
  assert.equal(index.indexed,3,'same TheMealDB ID cannot be counted twice');
  assert.equal(possibleSourceMatches('chicken biryani',index).length,1);
  assert.equal(possibleSourceMatches('CHICKEN-BIRYANI',index)[0].matchType,'same-normalised-title');
});
test('only reorders 3+ whole words, and the different-order result remains a clue',()=>{
  const index=recipeTitleIndex(records);
  assert.equal(possibleSourceMatches('Masala Chicken Curry',index)[0].matchType,'same-words-reordered');
  assert.equal(possibleSourceMatches('Biryani Chicken',index).length,0,'two-word reversal too ambiguous');
  assert.equal(possibleSourceMatches('Chicken Korma Curry',index).length,0);
  assert.equal(possibleSourceMatches('Butter Chicken',index).length,0);
  assert.equal(possibleSourceMatches('',index).length,0);
});
test('hydrated in-app catalogue Map is supported as well as source metadata arrays',()=>{
  const map=new Map([['India',new Map([['Chicken',{
    country:'India',category:'Chicken',recipes:[{
      id:'100',meal:{strMeal:'Chicken Biryani'}
    }]
  }]] )]]);
  const index=recipeTitleIndex({cells:map});
  assert.equal(index.indexed,1);
  assert.equal(possibleSourceMatches('Chicken Biryani',index)[0].country,'India');
});
test('cross-provider overlap report never merges records or claims a confirmed duplicate',()=>{
  const lead=[
    {id:'wikibooks:55',title:'chicken biryani',url:'https://en.wikibooks.org/wiki/Cookbook:Chicken_biryani'},
    {id:'wikibooks:56',title:'Masala Chicken Curry',url:'https://en.wikibooks.org/wiki/Cookbook:Masala_Chicken_Curry'},
    {id:'wikibooks:57',title:'Vegetarian biryani',url:'https://en.wikibooks.org/wiki/Cookbook:Vegetarian_biryani'}
  ];
  const report=sourceOverlapReport(records,lead);
  assert.deepEqual([report.providerRecords,report.wikibooksLeads,report.possibleOverlapLeads,report.confirmedDuplicates],
    [3,3,2,0]);
  assert.deepEqual(report.rows.map(r=>r.wikibooksId),['wikibooks:55','wikibooks:56']);
  assert.equal(report.rows[0].reviewStatus,'possible-overlap-not-confirmed');
  const csv=sourceOverlapCsv(report);
  assert.ok(csv.includes('NO'));
  assert.ok(csv.includes('same-words-reordered'));
  assert.ok(!csv.includes('Duplicate confirmed\\nYES'));
});
test('CSV output defends against formula injection in untrusted recipe titles',()=>{
  const source={cells:[{country:'India',category:'Dessert',recipes:[{id:'5',name:'=IMPORTXML("https://x", "//b")'}]}]};
  const leads=[{id:'wikibooks:2',title:'=IMPORTXML("https://x", "//b")',url:'https://en.wikibooks.org/wiki/Cookbook:Unsafe'}];
  const text=sourceOverlapCsv(sourceOverlapReport(source,leads));
  assert.ok(text.includes(String.fromCharCode(34,39)+'=IMPORTXML('));
});
