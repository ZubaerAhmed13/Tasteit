import test from 'node:test';
import assert from 'node:assert/strict';
import {worldResearchGapReport,worldResearchGapCsv} from '../src/research-report.js';
const snapshot={
  countries:[{country:'India',areas:['Indian']},{country:'Bangladesh',areas:['Bangladeshi']}],
  categories:['Vegetarian','Dessert'],
  cells:[{country:'India',category:'Vegetarian',count:4}],
  stats:{scanned:4}
};
const links=[
  {id:'wikibooks:1',sourcePageId:1,title:'Vegetable curry'},
  {id:'wikibooks:2',sourcePageId:2,title:'Dessert'},
  {id:'wikibooks:3',sourcePageId:3,title:'Rice pudding'}
];
const tags=new Map([
  [1,['Indian recipes','Vegetarian dishes']],
  [2,['West Indian recipes','Dessert recipes']],
  [3,['Bangladeshi recipes','Dessert recipes']]
]);
test('cross product contains honest sourced gaps and separate source-hint counts',()=>{
  const report=worldResearchGapReport(snapshot,links,tags);
  assert.equal(report.totalPairs,4);
  assert.equal(report.verifiedBest,0);
  const india=report.rows.find(x=>x.country==='India'&&x.category==='Vegetarian');
  assert.deepEqual([
    india.sourcedRecipes,india.sourcedShortfall,
    india.wikibooksCountryTagLeads,india.wikibooksJointTagLeads
  ],[4,26,1,1]);
  assert.deepEqual(india.sampleLeadIds,['wikibooks:1']);
  const bangladesh=report.rows.find(x=>x.country==='Bangladesh'&&x.category==='Dessert');
  assert.deepEqual([bangladesh.sourcedRecipes,bangladesh.sourcedShortfall,
    bangladesh.wikibooksCountryTagLeads,bangladesh.wikibooksJointTagLeads],[0,30,1,1]);
  assert.equal(report.rows.find(x=>x.country==='India'&&x.category==='Dessert').wikibooksJointTagLeads,0,
    'West Indian is not the same as Indian');
  assert.equal(report.pairsWithJointHints,2);
});
test('never calls country hint counts verified 30-best recipes',()=>{
  const report=worldResearchGapReport(snapshot,links,tags);
  const csv=worldResearchGapCsv(report);
  assert.match(csv,/UNVERIFIED/);
  assert.match(csv,/source-tag-hints-only/);
  assert.ok(!csv.includes('Authentic'));
  assert.throws(()=>worldResearchGapReport({},links,tags),/incomplete/);
});
test('CSV escapes spreadsheet formulas in third-party country labels',()=>{
  const hostile={...snapshot,countries:[{country:'=HYPERLINK("https://evil.test")',areas:['Evil']}]};
  const report=worldResearchGapReport(hostile,[],new Map());
  const csv=worldResearchGapCsv(report);
  assert.ok(csv.includes(String.fromCharCode(34,39) + '=HYPERLINK('));
});
