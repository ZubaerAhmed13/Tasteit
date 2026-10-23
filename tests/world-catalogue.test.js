import test from 'node:test';
import assert from 'node:assert/strict';
import {countryDirectory,documentedRecipeScore,catalogueFromProvider,catalogueCell,
  exportCatalogueIndex,CATALOGUE_TARGET} from '../src/world-catalogue.js';

const areas=[
  {strCountry:'Bangladesh',strArea:'Bangladeshi'},
  {strCountry:'Italy',strArea:'Italian'},
  {strCountry:'Dominica',strArea:'Dominican'},
  {strCountry:'Dominican Republic',strArea:'Dominican'}
];
const categories=['Dessert','Breakfast','Seafood'];
const recipe=(id,country='Bangladeshi',category='Dessert')=>({
  idMeal:String(id),strMeal:'Sourced recipe '+id,strArea:country,strCategory:category,
  strInstructions:'Boil the ingredients, season, then prepare and serve as written in this community recipe.',
  strIngredient1:'Rice',strMeasure1:'100 g',strIngredient2:'Milk',strMeasure2:'300 ml',
  strMealThumb:'https://www.themealdb.com/images/media/meals/photo.jpg',
  strSource:'https://example.org/recipe'
});

test('country directory preserves separate countries sharing an area',()=>{
  const dirs=countryDirectory(areas);
  assert.equal(dirs.length,4);
  assert.deepEqual(dirs.map(x=>x.country),['Bangladesh','Dominica','Dominican Republic','Italy']);
});

test('counts up to 30 actual unique provider candidates and shows missing coverage truthfully',()=>{
  const meals=Array.from({length:35},(_,i)=>recipe(i+1));
  const index=catalogueFromProvider([...meals,meals[0]],areas,categories);
  const cell=catalogueCell(index,'Bangladesh','Dessert');
  assert.equal(cell.count,30);
  assert.equal(cell.available,35);
  assert.equal(cell.missing,0);
  assert.equal(cell.reviewed,0,'no automatic editorial verification');
  assert.equal(index.stats.duplicates,1);
  assert.equal(index.stats.full,1);
  assert.equal(index.stats.combinations,12);
  const empty=catalogueCell(index,'Italy','Breakfast');
  assert.deepEqual([empty.count,empty.missing],[0,CATALOGUE_TARGET]);
  assert.equal(empty.status,'needs-sources');
});

test('does not misassign culturally ambiguous regional names to a country',()=>{
  const ambiguous=recipe(7,'Dominican','Breakfast');
  const explicit={...recipe(8,'Dominican','Breakfast'),strCountry:'Dominica'};
  const catalogue=catalogueFromProvider([ambiguous,explicit],areas,categories);
  assert.equal(catalogue.stats.ambiguous,1);
  assert.equal(catalogueCell(catalogue,'Dominica','Breakfast').count,1);
  assert.equal(catalogueCell(catalogue,'Dominican Republic','Breakfast').count,0);
});

test('metadata export links source IDs without copying instructions or photographs',()=>{
  const catalogue=catalogueFromProvider([recipe(3)],areas,categories);
  const report=exportCatalogueIndex(catalogue,{scannedAt:'2026-10-23T10:00:00Z'});
  const text=JSON.stringify(report);
  assert.equal(report.status,'provider-candidates-not-editorially-verified');
  assert.deepEqual(report.cells[0].recipeIds,['3']);
  assert.equal(report.cells[0].missing,29);
  assert.equal(text.includes('Boil the ingredients'),false);
  assert.equal(text.includes('/images/media/meals/photo.jpg'),false);
  assert.ok(documentedRecipeScore(recipe(5))>documentedRecipeScore({idMeal:'5',strMeal:'Sparse'}));
});

test('source data with missing country labels is held back, not invented',()=>{
  const source=catalogueFromProvider([recipe(2,'Unknown area')],areas,categories);
  assert.equal(source.stats.unclassified,1);
  assert.equal(source.stats.totalFound,0);
  assert.throws(()=>catalogueFromProvider([],areas,categories,0),/Invalid catalogue target/);
});
