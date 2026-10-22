import test from 'node:test';
import assert from 'node:assert/strict';
import {validServings,scaleMeasure,scaledIngredients,plannedIngredients,setRecipeServings,resolvePlanServings} from '../src/servings.js';

const dish={strMeal:'Family Rice',strIngredient1:'Rice',strMeasure1:'300 g',strIngredient2:'Eggs',strMeasure2:'1',strIngredient3:'Salt',strMeasure3:'to taste',strIngredient4:'Milk',strMeasure4:'½ l'};

test('servings need explicit, bounded whole-number confirmation',()=>{
  assert.equal(validServings(undefined),null);
  assert.equal(validServings(''),null);
  assert.equal(validServings('3.5'),null);
  assert.equal(validServings('-2'),null);
  assert.equal(validServings('25'),null);
  assert.equal(validServings('3'),3);
  assert.equal(validServings(24),24);
  assert.throws(()=>setRecipeServings({},'25'),/between 1 and 24/);
  assert.deepEqual(setRecipeServings({wanted:true,baseServings:2},''),{wanted:true});
});
test('scaling converts compatible measures while keeping their source recipe untouched',()=>{
  const items=scaledIngredients(dish,2,4);
  assert.equal(items[0].value,'600 g');
  assert.equal(items[0].status,'scaled');
  assert.equal(items[0].machineMeasure,'600 g');
  assert.equal(items[1].value,'2 pcs');
  assert.equal(items[2].status,'review');
  assert.equal(items[2].machineMeasure,'');
  assert.equal(items[3].value,'1 l');
  assert.equal(dish.strMeasure1,'300 g');
  assert.equal(scaleMeasure('1 cup',2,2).status,'original');
});
test('unknown recipe baseline does not claim scaling or assume four portions',()=>{
  assert.deepEqual(scaleMeasure('500 g',null,4),{value:'500 g',status:'unscaled',machineMeasure:'500 g'});
  assert.equal(resolvePlanServings({},4),null);
  assert.equal(resolvePlanServings({baseServings:2},undefined),2);
  assert.equal(resolvePlanServings({baseServings:2},5),5);
});
test('fractional count measures and unclear quantities require manual review',()=>{
  const half=scaleMeasure('1',2,1);
  assert.equal(half.status,'review');
  assert.equal(half.machineMeasure,'');
  assert.equal(scaleMeasure('a pinch',2,4).status,'review');
  assert.equal(scaleMeasure('1-2 tbsp',2,4).status,'review');
  const ingredients=plannedIngredients(dish,2,4);
  assert.equal(ingredients[0].measure,'600 g');
  assert.equal(ingredients[2].measure,'');
});
