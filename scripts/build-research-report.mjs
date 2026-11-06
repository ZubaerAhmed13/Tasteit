// Offline, reproducible research gap report from previously collected source metadata.
// No web scraping, country inference, generated recipes or copyrighted photo bytes.
// Precompiled country aliases are reused for all 3,799 research leads per country.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {worldResearchGapReport,worldResearchGapCsv} from '../src/research-report.js';

const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const [world,linked,pages]=await Promise.all([
  readJson('data/world-catalogue-index.json'),
  readJson('data/wikibooks-research-queue.json'),
  readJson('data/wikibooks-category-evidence.json')
]);
if(pages.failedBatches?.length)throw Error('Wikibooks category scan is incomplete.');
const categoryEvidence=new Map(pages.recipes.map(x=>[x.sourcePageId,x.categoryLabels]));
const report=worldResearchGapReport(world,linked.recipes,categoryEvidence);
if(report.totalPairs!==world.countries.length*world.categories.length)
  throw Error('Incomplete country × category research matrix.');
if(report.verifiedBest!==0 || report.rows.some(x=>x.reviewStatus!=='source-tag-hints-only'))
  throw Error('Unreviewed research cannot be treated as approved recipes.');
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/world-research-gaps.json',JSON.stringify({
  ...report,generatedAt:new Date().toISOString(),
  sourceSnapshots:[
    'data/world-catalogue-index.json',
    'data/wikibooks-research-queue.json',
    'data/wikibooks-category-evidence.json'
  ],
  caveat:'Country/category labels are third-party tags only. Counts are candidate leads, not licensed/authentic or top-ranked dishes.'
},null,2)+'\n');
await writeFile('artifacts/world-research-gaps.csv',worldResearchGapCsv(report));
console.log(JSON.stringify({
  countryCategoryPairs:report.totalPairs,
  realSourcedRecipes:report.sourceRecords,
  wikibooksLinkedPages:report.wikibooksResearchPages,
  pairsWithCountryTagHints:report.pairsWithCountryHints,
  pairsWithCountryAndCategoryTagHints:report.pairsWithJointHints,
  verifiedBest:report.verifiedBest
},null,2));
