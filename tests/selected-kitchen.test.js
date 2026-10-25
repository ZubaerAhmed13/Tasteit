import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStore,ingredientsOf,exportBackup,parseBackup} from '../src/model.js';
import {scaledIngredients,plannedIngredients} from '../src/servings.js';
const record={id:'recipetineats-example',source:'recipetineats',url:'https://www.recipetineats.com/example/',title:'Original recipe',author:'Author',cuisine:'Japanese',category:'Main Course',ingredients:Array.from({length:28},(_,i)=>(i+1)+' g ingredient '+i),rating:{value:4.8,best:5,worst:1,count:100,countType:'ratings'},photoUrl:'https://www.recipetineats.com/example.jpg',checkedAt:'2026-10-25T10:00:00Z'};
test('collection flags preserve unrelated, cooking and plan records in fresh snapshots',async()=>{
 const {toggleCollectedFlag,collectedMeal}=await import('../src/selected-kitchen.js');const state=emptyStore(),id=collectedMeal(record).idMeal;
 state.saved['personal-other']={meal:{strMeal:'Other'},usual:true};
 state.saved[id]={meal:collectedMeal(record),wanted:true,cookedCount:2,tags:['Family']};
 state.plan['2026-10-25']=id;
 const next=toggleCollectedFlag(state,record,'usual');assert.equal(next.saved[id].usual,true);assert.equal(next.saved[id].wanted,true);assert.equal(next.saved[id].cookedCount,2);assert.deepEqual(next.saved[id].tags,['Family']);assert.equal(state.saved[id].usual,undefined);assert.equal(next.saved['personal-other'],state.saved['personal-other']);
 assert.equal(toggleCollectedFlag(next,record,'wanted').saved[id].wanted,false);assert.equal(next.plan['2026-10-25'],id);
 assert.throws(()=>toggleCollectedFlag(state,record,'unexpected'));
});
test('collected recipes preserve all source rows and ratings without pretending to have copied methods',async()=>{
 const {collectedMeal,collectedRecipe}=await import('../src/selected-kitchen.js');
 const meal=collectedMeal(record);assert.equal(meal.idMeal,'selected-'+record.id);assert.equal(meal.strSource,record.url);assert.equal(meal.strInstructions,'');
 assert.deepEqual(collectedRecipe(meal),record);assert.equal(collectedRecipe({...meal,idMeal:'1'}),null);
 assert.equal(collectedRecipe({...meal,selectedRecipe:{...record,source:'evil'}}),null);
});
test('unparsed publisher ingredients are held from automated suggestions when ingredient skips are set',async()=>{
 const {collectedMeal}=await import('../src/selected-kitchen.js');const {recommendRecipes}=await import('../src/personalisation.js');
 const meal=collectedMeal({...record,ingredients:['250 ml milk','1 cup rice']}),saved={[meal.idMeal]:{meal,wanted:true}};
 assert.equal(recommendRecipes([],saved,[],{cuisines:[],avoidIngredients:['milk'],hiddenRecipeIds:[]}).length,0);
 assert.equal(recommendRecipes([],saved,[],{cuisines:[],avoidIngredients:[],hiddenRecipeIds:[]}).length,1);
});
test('collected recipes keep rows beyond twenty through backup, portions and shopping without invented measurements',async()=>{
 const {collectedMeal}=await import('../src/selected-kitchen.js');const meal=collectedMeal(record),store=emptyStore();store.saved[meal.idMeal]={meal,wanted:true};
 const restored=parseBackup(exportBackup(store)).saved[meal.idMeal].meal;
 assert.equal(ingredientsOf(restored).length,28);assert.equal(ingredientsOf(restored)[27].name,record.ingredients[27]);
 assert.equal(scaledIngredients(restored,4,8).length,28);assert.equal(plannedIngredients(restored,4,8)[27].name,record.ingredients[27]);
 assert.equal(plannedIngredients(restored,4,8)[27].measure,'','source line quantities remain unparsed');
 const bad={...store,saved:{[meal.idMeal]:{meal:{...meal,selectedRecipe:{...record,url:'https://evil.test/recipe'}},wanted:true}}};
 assert.throws(()=>parseBackup(exportBackup(bad)),/invalid.*recipe|invalid.*record/i);
});
test('ingredient references expose actual image plus complete adjacent credits and escape all labels',async()=>{
 const {ingredientReference}=await import('../src/ingredient-reference.js');
 const photo={id:'garlic',label:'Garlic <fresh>',creator:'Cook & photographer',verified:true,aliases:['garlic'],form:'whole',url:'https://upload.wikimedia.org/garlic.jpg',filePage:'https://commons.wikimedia.org/wiki/File:Garlic.jpg',licence:'CC BY 4.0',licenceUrl:'https://creativecommons.org/licenses/by/4.0/',creditLinks:[{label:'Original source',url:'https://example.org/credit'}]};
 const html=ingredientReference('garlic',[photo]);assert.match(html,/<img /);assert.match(html,/https:\/\/example.org\/credit/);assert.match(html,/Garlic &lt;fresh&gt;/);assert.doesNotMatch(html,/<fresh>/);
 assert.match(ingredientReference('mystery ingredient',[photo]),/Photo not verified/);
 assert.match(ingredientReference('garlic',[{...photo,creditLinks:[{label:'bad',url:'javascript:alert(1)'}]}]),/Photo not verified/);
});
