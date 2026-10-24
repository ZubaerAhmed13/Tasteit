// Produce a link-only human review queue for possible source overlaps.
// This process NEVER removes or approves recipe records.
// The output is an independent, repeatable set of review leads, not a verdict.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {sourceOverlapReport,sourceOverlapCsv} from '../src/source-overlap.js';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const [catalogue,linked]=await Promise.all([
  read('data/world-catalogue-index.json'),
  read('data/wikibooks-research-queue.json')
]);
if(catalogue?.status!=='provider-candidates-not-editorially-verified' ||
  linked?.status!=='linked-research-only-not-country-categorised' ||
  !Array.isArray(linked.recipes))throw Error('Source metadata is missing or unexpected.');
const report=sourceOverlapReport(catalogue,linked.recipes);
if(report.confirmedDuplicates!==0 || report.policy!=='research-only-never-auto-deduplicate')
  throw Error('Overlap clues may not automatically approve or merge records.');
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/source-overlap-review.json',JSON.stringify({
  ...report,createdAt:new Date().toISOString(),
  notes:[
    'Matches are title similarities, not proofs of equivalent recipes.',
    'Check ingredients, methods, regional variants, cultural origin and independent source links.',
    'No recipe, photo or text licensing permission is inferred.',
    'None of the original source records are removed from the 30-per-category coverage counts.'
  ]
},null,2)+'\n');
await writeFile('artifacts/source-overlap-review.csv',sourceOverlapCsv(report));
console.log(JSON.stringify({
  providerRecords:report.providerRecords,
  wikibooksLeads:report.wikibooksLeads,
  researchLeadsWithPossibleOverlaps:report.possibleOverlapLeads,
  confirmedDuplicates:report.confirmedDuplicates
},null,2));
