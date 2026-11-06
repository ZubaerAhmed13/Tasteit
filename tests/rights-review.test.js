import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyRightsReview,prepareRightsReview,validRightsReview,
  rightsReviewChecklist,httpsEvidence} from '../src/rights-review.js';
import {editorialReview,validEditorialReviews,exportEditorialReviewCsv} from '../src/editorial.js';
import {emptyStore,parseBackup,exportBackup} from '../src/model.js';

const options={id:'wikibooks:123',countries:['India'],categories:['Vegetarian'],
  now:new Date('2026-10-23T11:00:00Z')};
const reviewBase={
  country:'India',category:'Vegetarian',status:'shortlisted',
  evidenceUrl:'https://example.org/regional-culinary-history',
  notes:'Independently cited material describing origins and a shared regional recipe.'
};
test('link-only is a safe backwards-compatible default; it never grants permission',()=>{
  assert.equal(validRightsReview(undefined),true);
  assert.deepEqual(prepareRightsReview({}),emptyRightsReview());
  const status=rightsReviewChecklist(emptyRightsReview());
  assert.equal(status.needsIndependentRightsReview,false);
  assert.equal(status.approved,false);
  assert.equal(status.publishable,false);
  assert.equal(editorialReview(reviewBase,options).rights.textPlan,'link-only');
});
test('proposed text reuse requires an attributable, HTTPS licence evidence link',()=>{
  const good={textPlan:'reuse-needs-review',
    textLicenseUrl:'https://en.wikibooks.org/wiki/Wikibooks:Copyrights',
    textAttribution:'Wikibooks contributors · Cookbook source · CC BY-SA 4.0'};
  assert.throws(()=>prepareRightsReview({textPlan:'reuse-needs-review'}),/licence link/);
  assert.throws(()=>prepareRightsReview({...good,textLicenseUrl:'http://example.org'}),/HTTPS/);
  assert.throws(()=>prepareRightsReview({...good,textAttribution:''}),/attribution/);
  const r=prepareRightsReview(good);
  assert.equal(validRightsReview(r),true);
  assert.equal(rightsReviewChecklist(r).textReuseProposed,true);
  assert.equal(rightsReviewChecklist(r).publishable,false);
});
test('proposed photo reuse requires traceable file licence, author and attribution',()=>{
  const good={
    photoPlan:'reuse-needs-review',
    photoSourceUrl:'https://commons.wikimedia.org/wiki/File:Example.jpg',
    photoLicenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
    photoCreator:'Example photographer',
    photoAttribution:'Example photographer · Wikimedia Commons · CC BY-SA'
  };
  assert.throws(()=>prepareRightsReview({photoPlan:'reuse-needs-review'}),/file page/);
  assert.throws(()=>prepareRightsReview({...good,photoCreator:''}),/creator/);
  assert.throws(()=>prepareRightsReview({...good,photoLicenseUrl:'javascript:alert(1)'}),/HTTPS/);
  const r=prepareRightsReview(good);
  assert.equal(rightsReviewChecklist(r).photoReuseProposed,true);
  assert.equal(rightsReviewChecklist(r).needsIndependentRightsReview,true);
  assert.equal(rightsReviewChecklist(r).approved,false);
});
test('rejects forged rights metadata, usernames in URLs and arbitrary oversized input',()=>{
  assert.equal(httpsEvidence('https://user:password@example.org/x'),false);
  assert.equal(validRightsReview({textPlan:'reuse-needs-review'}),false);
  assert.equal(validRightsReview({...emptyRightsReview(),photoPlan:'permission-granted'}),false);
  assert.throws(()=>prepareRightsReview({textPlan:'allowed'}),/recognised/);
  assert.throws(()=>prepareRightsReview({reviewNotes:'x'.repeat(800)}),/too long/);
  assert.equal(validEditorialReviews({'wikibooks:123':{
    ...editorialReview(reviewBase,options),rights:{...emptyRightsReview(),photoCreator:24}
  }}),false);
});
test('new rights evidence saves in old-format backups, cannot be auto-approved and exports to CSV',()=>{
  const review=editorialReview({...reviewBase,
    textPlan:'reuse-needs-review',
    textLicenseUrl:'https://en.wikibooks.org/wiki/Wikibooks:Copyrights',
    textAttribution:'Wikibooks contributors · original page'},
    options);
  const store=emptyStore();
  store.editorialReviews={'wikibooks:123':review};
  assert.deepEqual(parseBackup(exportBackup(store)),store);
  const legacy={...store,editorialReviews:{
    'wikibooks:123':Object.fromEntries(Object.entries(review).filter(([k])=>k!=='rights'))
  }};
  assert.deepEqual(parseBackup(exportBackup(legacy)),legacy);
  const csv=exportEditorialReviewCsv(store.editorialReviews,[{
    id:'wikibooks:123',title:'Vegetarian Dish',url:'https://en.wikibooks.org/wiki/Cookbook:Test'
  }]);
  assert.ok(csv.includes('Wikibooks contributors'));
  assert.ok(csv.includes('NOT APPROVED'));
  assert.ok(csv.includes('reuse-needs-review'));
});
