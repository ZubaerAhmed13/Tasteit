// GitHub development collection only. Uses the official TheMealDB API,
// keeps a metadata index (not copied instructions/images), and publishes an
// Actions artifact for human research. Does not claim popularity or authenticity.
import { mkdir, writeFile } from 'node:fs/promises';
import { availableAreaRecords, availableCategories, scanWorldRecipes } from '../src/api.js';
import { catalogueFromProvider, exportCatalogueIndex } from '../src/world-catalogue.js';

const timeout=new AbortController();
const timeoutId=setTimeout(()=>timeout.abort(),240_000);
try{
  console.log('Gathering provider-listed countries and meal categories.');
  const [areas,categories]=await Promise.all([
    availableAreaRecords(timeout.signal),availableCategories(timeout.signal)
  ]);
  if(!areas.length||!categories.length)throw new Error('Source directory returned no areas or categories.');
  const scanned=await scanWorldRecipes({
    signal:timeout.signal,concurrency:2,
    onProgress:p=>console.log('Source index '+p.completed+'/'+p.total+
      ' letters; '+p.recipes+' records; '+p.failed+' failed letters')
  });
  const catalogue=catalogueFromProvider(scanned.meals,areas,categories);
  const output=exportCatalogueIndex(catalogue);
  output.scanComplete=scanned.completed===scanned.total && scanned.failedLetters.length===0;
  output.failedInitials=scanned.failedLetters;
  output.sourceTerms='https://www.themealdb.com/terms_of_use.php';
  output.notes=[
    'Country and category are provider labels, not authenticated origins.',
    'Documentation score is not a popularity, taste or culinary quality rating.',
    'Recipe instructions and photographs are not rehosted in this metadata artifact.',
    'Target 30 per relevant country-category pair; never generate filler recipes.',
    'Human editorial review and third-party image rights are not established.'
  ];
  await mkdir('artifacts',{recursive:true});
  await writeFile('artifacts/world-catalogue-index.json',JSON.stringify(output,null,2)+'\n');
  const escapeCell=x=>{
    const val=String(x??'');
    const safe=/^[=+\-@\t\r]/.test(val)?"'"+val:val;
    return '"'+safe.replace(/"/g,'""')+'"';
  };
  const csv=[
    ['Country','Provider category','Found of 30','Provider candidates','Missing to target','Editorially reviewed','Status'],
    ...[...catalogue.cells.values()].flatMap(group=>[...group.values()].map(cell=>
      [cell.country,cell.category,cell.count,cell.available,cell.missing,cell.reviewed,
       cell.status]))
  ].map(row=>row.map(escapeCell).join(',')).join('\n')+'\n';
  await writeFile('artifacts/world-catalogue-coverage.csv',csv);
  console.log('Source-linked metadata and gap report created.',JSON.stringify(catalogue.stats));
  if(!output.scanComplete){
    console.error('Provider scan incomplete for letters:',scanned.failedLetters.join(','));
    process.exitCode=2;
  }
}catch(error){
  console.error('Unable to complete source catalogue collection:',error.message);
  process.exitCode=1;
}finally{
  clearTimeout(timeoutId);
}
