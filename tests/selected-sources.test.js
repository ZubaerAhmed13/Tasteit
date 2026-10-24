import test from 'node:test';
import assert from 'node:assert/strict';
const api=()=>import('../src/selected-sources.js');
const url='https://www.recipetineats.com/chicken-curry/';
const recipe={ '@type':'Recipe','@id':url+'#recipe',url,name:'Chicken Curry',author:{'@type':'Person',name:'Nagi'},recipeIngredient:['2 cloves garlic','1 cup rice'],aggregateRating:{'@type':'AggregateRating',ratingValue:'4.9',bestRating:'5',ratingCount:'238',reviewCount:'517'},image:'https://www.recipetineats.com/tachyon/curry.jpg'};
const html=value=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';
test('only the 16 selected publishers pass exact HTTPS source validation',async()=>{
 const {SOURCES,approvedSource}=await api();assert.equal(SOURCES.length,16);
 assert.equal(approvedSource(url).id,'recipetineats');
 for(const bad of ['http://www.recipetineats.com/x','https://recipetineats.com.evil.test/x','https://evil.recipetineats.com/x','https://user:secret@recipetineats.com/x','https://recipetineats.com:444/x','https://themealdb.com/x','https://en.wikibooks.org/x'])assert.equal(approvedSource(bad),null,bad);
});
test('main recipe metadata wins over related recipes and webpage ratings',async()=>{
 const {extractRecipe}=await api();const related={...recipe,'@id':'https://www.recipetineats.com/other/#recipe',url:'https://www.recipetineats.com/other/',name:'Other',aggregateRating:{ratingValue:1,bestRating:5,ratingCount:999}};
 const record=extractRecipe(html({'@graph':[related,{'@type':'WebPage',url,aggregateRating:{ratingValue:5,ratingCount:9999}},recipe]}),url);
 assert.equal(record.title,'Chicken Curry');assert.equal(record.rating.value,4.9);assert.equal(record.rating.count,238);assert.equal(record.rating.countType,'ratings');assert.deepEqual(record.ingredients,['2 cloves garlic','1 cup rice']);assert.equal('instructions' in record,false);
});
test('ambiguous recipes, disallowed canonical origins and malformed scripts fail closed',async()=>{
 const {extractRecipe}=await api();assert.throws(()=>extractRecipe(html({...recipe,url:'https://evil.test/x'}),url));
 assert.throws(()=>extractRecipe(html([{...recipe,url:undefined,'@id':undefined},{...recipe,url:undefined,'@id':undefined,name:'Other'}]),url));
 assert.throws(()=>extractRecipe('<script type="application/ld+json">bad</script>',url));
});
test('review counts remain reviews and unrated placeholders never become ratings',async()=>{
 const {extractRecipe}=await api();const r=extractRecipe(html({...recipe,aggregateRating:{ratingValue:4.5,reviewCount:10}}),url);assert.equal(r.rating.countType,'reviews');assert.equal(r.rating.count,10);
 for(const aggregateRating of [undefined,{ratingValue:5,ratingCount:0},{ratingValue:9,bestRating:5},{ratingValue:'NaN',bestRating:5}])assert.equal(extractRecipe(html({...recipe,aggregateRating}),url).rating,null);
});
test('filters use ingredient/name/source and rated sorting keeps missing scores last',async()=>{
 const {filterRecipes,extractRecipe}=await api();const a=extractRecipe(html(recipe),url),b={...a,id:'unrated',title:'Rice',rating:null};
 assert.deepEqual(filterRecipes([b,a],{query:'garlic',ratedOnly:true,sort:'rating'}).map(x=>x.title),['Chicken Curry']);
 assert.deepEqual(filterRecipes([b,a],{source:'recipetineats',sort:'rating'}).map(x=>x.title),['Chicken Curry','Rice']);
});
test('collector rejects disallowed redirects before requesting the destination',async()=>{
 const {fetchPage}=await import('../scripts/collect-selected-recipes.mjs');let calls=0;
 await assert.rejects(fetchPage(url,async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://evil.test/recipe'}});}),/allowlisted/);assert.equal(calls,1);
});
test('author graph references preserve the original named credit',async()=>{
 const {extractRecipe}=await api();const person={'@id':url+'#author','@type':'Person',name:'Original Cook'};
 assert.equal(extractRecipe(html({'@graph':[person,{...recipe,author:{'@id':person['@id']}}]}),url).author,'Original Cook');
});
test('every canonical publisher is checked regardless of attribute order or quoting',async()=>{
 const {extractRecipe}=await api();
 for(const link of ['<link href="https://evil.test/recipe" rel="canonical">','<link HREF=https://evil.test/recipe REL=canonical>','<link rel="canonical" href="https://www.recipetineats.com/chicken-curry/"><link href="https://evil.test/x" rel="canonical">'])assert.throws(()=>extractRecipe(link+html(recipe),url),/canonical/i);
});
test('aggregator original-source references cannot hide in arrays or @id objects',async()=>{
 const {extractRecipe}=await api(),u='https://app.samsungfood.com/recipes/123';
 for(const isBasedOn of [{'@id':'https://evil.test/recipe'},['https://evil.test/recipe'],{},[{url:'https://www.recipetineats.com/chicken-curry/'},{'@id':'https://evil.test/x'}]])assert.throws(()=>extractRecipe(html({...recipe,url:u,'@id':u+'#recipe',isBasedOn}),u),/original|provenance/i);
});
test('an identity-less nested related recipe cannot become the main recipe',async()=>{
 const {extractRecipe}=await api();const related={...recipe,url:undefined,'@id':undefined};
 assert.throws(()=>extractRecipe(html({'@type':'WebPage',url,mainEntity:{'@type':'Article',name:'Article'},related:related}),url),/main|unambiguous/i);
 assert.equal(extractRecipe(html({'@type':'WebPage',url,mainEntity:related}),url).title,recipe.name);
});
test('rating counts and their stated meaning must agree',async()=>{
 const {extractRecipe,validateRecipe}=await api();const r=extractRecipe(html(recipe),url);
 assert.throws(()=>validateRecipe({...r,rating:{...r.rating,countType:null}}),/rating/i);
 assert.throws(()=>validateRecipe({...r,rating:{...r.rating,count:null}}),/rating/i);
});
