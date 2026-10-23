// Headless browser acceptance for Tasteit. API responses are intentionally
// fixture-backed: the test verifies UI behaviour independently of TheMealDB uptime.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

const meal = {
  idMeal: '1', strMeal: 'Tomato Rice', strArea: 'Indian',
  strCategory: 'Vegetarian', strInstructions: 'Wash the rice.\nCook the rice with tomatoes.',
  strIngredient1: 'Tomatoes', strMeasure1: '2',
  strIngredient2: 'Rice', strMeasure2: '1 cup',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/example.jpg',
  strYoutube: 'https://www.youtube.com/watch?v=example123',
  strSource: 'https://www.themealdb.com/'
};
const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    const allowed = new Set(['index.html','styles.css','favicon.svg','src/app.js','src/navigation.js','src/api.js','src/model.js','src/quantities.js','src/organise.js','src/pantry-bulk.js','src/pantry-batches.js','src/servings.js','src/kitchen-discovery.js','src/cooking.js','src/shopping.js','src/world-catalogue.js','src/editorial.js','src/research-priority.js','src/rights-review.js','src/source-media.js','src/source-overlap.js']);
    if (!allowed.has(file)) { res.writeHead(404); res.end('Not found'); return; }
    const body = await readFile(path.join(process.cwd(),file));
    const ext = path.extname(file);
    res.writeHead(200,{ 'Content-Type': ext==='.js'?'text/javascript':ext==='.css'?'text/css':ext==='.svg'?'image/svg+xml':'text/html' });
    res.end(body);
  } catch(e) { res.writeHead(500); res.end(String(e)); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const url = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  const choice=process.env.TASTEIT_BROWSER || 'chromium';
  const driver={chromium,firefox,webkit}[choice];
  if(!driver) throw new Error('Unsupported browser: '+choice);
  browser = await driver.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1300,height:900},acceptDownloads:true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', response => {
    if(response.url().includes('/src/') && response.status()>=400)
      errors.push('Source module HTTP '+response.status()+': '+response.url());
  });
  await page.route('**/api/json/v1/1/**', async route => {
    const u = new URL(route.request().url());
    const endpoint = u.pathname.split('/').pop();
    const body = endpoint === 'list.php' && u.searchParams.has('a')
      ? {meals:[{strArea:'Indian',strCountry:'India'},{strArea:'Italian',strCountry:'Italy'}]} :
      endpoint === 'list.php' && u.searchParams.has('c')
      ? {meals:[{strCategory:'Vegetarian'},{strCategory:'Dessert'}]} :
      endpoint === 'lookup.php' ? {meals:[meal]} :
      endpoint === 'filter.php' ? {meals:[{ idMeal:meal.idMeal, strMeal:meal.strMeal, strMealThumb:meal.strMealThumb }]} :
      {meals:[meal]};
    await route.fulfill({status:200,headers,body:JSON.stringify(body)});
  });
  // A pre-collected source-only snapshot should load immediately; full cooking
  // directions remain fetched from the provider when a recipe is opened.
  await page.route('**/data/world-catalogue-index.json', route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({
      version:1,scannedAt:'2026-10-23T08:00:00Z',scanComplete:true,failedInitials:[],
      countries:[{country:'India',areas:['Indian']},{country:'Italy',areas:['Italian']}],
      categories:['Vegetarian','Dessert'],
      stats:{countries:2,categories:2,combinations:4,nonempty:1,full:0,scanned:1,
        totalFound:1,duplicates:0,unclassified:0,ambiguous:0},
      cells:[{country:'India',category:'Vegetarian',available:1,count:1,missing:29,
        recipes:[{id:'1',name:'Tomato Rice',providerArea:'Indian',
          photoUrl:meal.strMealThumb,documentationScore:85,reviewStatus:'not-reviewed'}]}]
    })
  }));
  await page.route('**/data/world-research-gaps.json', route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({
      version:1,status:'unreviewed-research-leads-not-verified-best-recipes',
      rows:[{country:'India',category:'Vegetarian',
        wikibooksJointTagLeads:1,wikibooksCountryTagLeads:2}]
    })
  }));
  await page.route('**/data/wikibooks-research-queue.json', route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({version:1,recipes:[
      {id:'wikibooks:1',title:'Chicken Biryani',sourcePageId:101,
       url:'https://en.wikibooks.org/wiki/Cookbook:Chicken_Biryani',
       country:null,course:null,status:'needs-editorial-origin-and-course-review'},
      {id:'wikibooks:2',title:'Apple Pie',sourcePageId:102,
       url:'https://en.wikibooks.org/wiki/Cookbook:Apple_Pie',
       country:null,course:null,status:'needs-editorial-origin-and-course-review'},
      {id:'wikibooks:3',title:'Tomato Rice',sourcePageId:103,
        url:'https://en.wikibooks.org/wiki/Cookbook:Tomato_Rice',
        country:null,course:null,status:'needs-editorial-origin-and-course-review'},
      ...Array.from({length:26},(_,i)=>({
        id:'wikibooks:test-'+i,title:'Fixture research item '+i,
        url:'https://en.wikibooks.org/wiki/Cookbook:Fixture_'+i,
        country:null,course:null,status:'needs-editorial-origin-and-course-review'
      }))
    ]})
  }));
  await page.route('**/data/wikibooks-category-evidence.json', route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({version:1,records:1,recipes:[
      {sourcePageId:101,categoryLabels:['Rice dishes','South Asian recipes','Indian recipes','Vegetarian dishes']},
      {sourcePageId:102,categoryLabels:['West Indian dishes','Dessert recipes']}
    ]})
  }));
  await page.route('**/w/api.php**', route => {
    const uri=new URL(route.request().url());
    const wikibooks=uri.hostname==='en.wikibooks.org';
    const body=wikibooks
      ? {query:{pages:[{pageid:101,images:[
          {title:'File:Test food.jpg'},{title:'File:Preparation.svg'}
        ]}]}}
      : {query:{pages:[{title:'File:Test food.jpg',imageinfo:[{
          extmetadata:{
            Artist:{value:'Test food photographer'},
            Credit:{value:'Wikimedia contributor archive'},
            LicenseShortName:{value:'CC BY-SA 4.0'},
            LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'},
            AttributionRequired:{value:'true'}
          }
        }]}]}};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.route('**/images/media/meals/**', route => route.fulfill({
    status:200,contentType:'image/svg+xml',
    body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect width="200" height="140" fill="#dde7cf"/></svg>'
  }));

  await page.goto(url);
  await page.locator('.recipe-card').first().waitFor({timeout:12000}).catch(async error => { throw new Error(error.message + '\nBrowser errors: ' + JSON.stringify(errors) + '\nPage snapshot: ' + (await page.locator('#app').innerText()).slice(0,900)); });
  assert.equal(await page.locator('.recipe-card').count(),1,'live discovery card from fixture');
  await page.locator('#discover-category').selectOption('Vegetarian');
  await page.locator('#discovery-filters button[type=submit]').click();
  await page.locator('.recipe-card').first().waitFor();
  assert.ok((await page.locator('h2').allTextContents()).some(x=>x.includes('Vegetarian')),'provider category filter opens');
  await page.locator('#discover-category').selectOption('');
  await page.locator('#discovery-filters button[type=submit]').click();
  await page.locator('.recipe-card').first().waitFor();
  await page.locator('#discover-letter').selectOption('T');
  await page.locator('#discovery-filters button[type=submit]').click();
  await page.locator('.recipe-card').first().waitFor();
  assert.ok((await page.locator('h2').allTextContents()).some(x=>x.includes('Recipes beginning with T')),'alphabetical discovery opens');
  await page.locator('[data-action="surprise"]').click();
  await page.locator('[role="dialog"] h2').getByText('Tomato Rice').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-action="featured"]').first().click();
  await page.locator('.recipe-card').first().waitFor();

  // The world catalogue never fabricates 30 entries; it counts actual source IDs.
  await page.locator('.site-nav [data-nav="world"]').click();
  await page.locator('.world-stats').waitFor({timeout:14000}).catch(async error=>{
    throw new Error('World source snapshot did not load: '+error.message+
      '\nUI snapshot: '+(await page.locator('#app').innerText()).slice(0,1500)+
      '\nBrowser errors: '+JSON.stringify(errors));
  });
  await page.locator('#world-country option').first().waitFor({state:'attached'});
  assert.equal(await page.locator('#world-country').inputValue(),'India',
    'cached catalogues initialise the country before the optional live source refresh');
  assert.equal(await page.locator('#world-category').inputValue(),'Dessert',
    'cached catalogues initialise the category before the optional live source refresh');
  await page.locator('#world-country').selectOption('India');
  await page.locator('#world-category').selectOption('Vegetarian');
  await page.getByRole('heading',{name:'India · Vegetarian'}).waitFor({timeout:15000}).catch(async error=>{
    throw new Error('World filters did not reflect the chosen country and category: '+error.message+
      '\nUI snapshot: '+(await page.locator('#app').innerText()).slice(0,1500));
  });
  assert.ok((await page.locator('.world-result-head').innerText()).includes('1 / 30'),
    'snapshot exposes sourced candidates before an expensive new scan');
  await page.locator('.world-review-audit').waitFor();
  assert.ok((await page.locator('.world-review-audit').innerText()).includes('1 Wikibooks page(s)'));
  assert.ok((await page.locator('.world-review-audit').innerText()).includes('unverified source clues'));
  await page.locator('.world-result-head ~ .recipe-grid .recipe-photo').first().click();
  await page.locator('[role="dialog"] h2').getByText('Tomato Rice').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-action="world-scan"]').click();
  await page.getByRole('heading',{name:'India · Vegetarian'}).waitFor({timeout:20000});
  assert.ok((await page.locator('.world-result-head').innerText()).includes('1 / 30'));
  assert.equal(await page.locator('.world-result-head').count(),1);
  assert.equal(await page.locator('.world-stats strong').first().innerText(),'2');
  assert.equal(await page.locator('.world-result-head ~ .recipe-grid .recipe-card').count(),1,'only sourced candidates');
  await page.locator('#world-category').selectOption('Dessert');
  await page.getByRole('heading',{name:'No sourced recipes in this combination'}).waitFor();
  await page.locator('#world-category').selectOption('Vegetarian');
  await page.locator('[data-action="world-review-focus"]').click();
  await page.getByRole('heading',{name:'More recipe sources to research'}).waitFor();
  await page.locator('.world-research-list li').first().waitFor({timeout:12000});
  assert.equal(await page.locator('#world-research-focus').inputValue(),'country-category');
  assert.equal(await page.locator('.world-research-list li').count(),1,'audit opens country/course evidence queue');
  await page.locator('#world-research-focus').selectOption('all');
  await page.locator('#world-research-form button[type=submit]').click();
  assert.equal(await page.locator('.world-research-list li').count(),24);
  await page.locator('[data-action="world-research-next"]').click();
  assert.equal(await page.locator('.world-research-list li').count(),5,'extra overlap fixture also appears on second research page');
  await page.locator('[data-action="world-research-prev"]').click();
  assert.equal(await page.locator('.world-research-list li').count(),24);
  await page.locator('#world-research-query').fill('biryani');
  await page.locator('#world-research-form button[type=submit]').click();
  assert.equal(await page.locator('.world-research-list li').count(),1);
  assert.ok((await page.locator('.world-research-list a').innerText()).includes('Chicken Biryani'));
  assert.ok((await page.locator('.world-research').innerText()).includes('Source tags (unverified): Rice dishes'));
  await page.locator('#world-research-query').fill('');
  await page.locator('#world-research-tag').fill('');
  await page.locator('#world-research-focus').selectOption('country-category');
  await page.locator('#world-research-form button[type=submit]').click();
  assert.equal(await page.locator('.world-research-list li').count(),1,
    'country/course source-tag hints select only the matching research lead');
  assert.ok((await page.locator('.world-research-list').innerText()).includes('Country tag clue: Indian recipes'));
  assert.ok((await page.locator('.world-priority-summary').innerText()).includes('not verified'));
  assert.ok((await page.locator('.world-research').innerText()).includes('do not increase the 30-recipe target count'));
  await page.locator('#world-research-focus').selectOption('all');
  await page.locator('#world-research-query').fill('biryani');
  await page.locator('#world-research-form button[type=submit]').click();
  assert.ok((await page.locator('.world-research').innerText()).includes('Country and course assignments require human verification'));
  await page.locator('[data-action="world-research-review"]').first().click();
  await page.locator('[data-action="world-media-inspect"]').click();
  await page.locator('[data-action="world-media-file"]').first().waitFor();
  assert.equal(await page.locator('.source-media-list button').count(),2,'source image filenames are found on demand');
  await page.locator('[data-action="world-media-file"][data-title="File:Test food.jpg"]').click();
  await page.getByText('Test food photographer').waitFor();
  assert.ok((await page.locator('.source-media-details').innerText()).includes('CC BY-SA 4.0'));
  assert.ok((await page.locator('.source-media-panel').innerText()).includes('Reuse remains unapproved.'));
  assert.equal(await page.locator('#review-country').count(),1,'checking source photos must not close the research editor');
  await page.locator('#review-country').selectOption('India');
  await page.locator('#review-category').selectOption('Vegetarian');
  await page.locator('#review-status').selectOption('shortlisted');
  await page.locator('#review-evidence').fill('https://example.org/culinary-origin');
  await page.locator('#review-notes').fill('The recipe appears in multiple regional cuisines; requires further checking.');
  await page.locator('.rights-editor summary').click();
  await page.locator('#review-text-plan').selectOption('reuse-needs-review');
  await page.locator('#review-text-license').fill('https://en.wikibooks.org/wiki/Wikibooks:Copyrights');
  await page.locator('#review-text-attribution').fill('Wikibooks contributors · original recipe · CC BY-SA');
  await page.locator('#review-photo-plan').selectOption('reuse-needs-review');
  await page.locator('#review-photo-source').fill('https://commons.wikimedia.org/wiki/File:Example.jpg');
  await page.locator('#review-photo-license').fill('https://creativecommons.org/licenses/by-sa/4.0/');
  await page.locator('#review-photo-creator').fill('Example contributor');
  await page.locator('#review-photo-attribution').fill('Example contributor · Commons · CC BY-SA');
  await page.locator('#review-rights-notes').fill('Exact photograph and original revision still need independent legal and attribution review.');
  await page.locator('#world-review-form button[type=submit]').click();
  await page.getByText('shortlisted (NOT approved): 1').waitFor();
  const savedResearch=await page.evaluate(() =>
    JSON.parse(localStorage.getItem('tasteit.local.v1')).editorialReviews['wikibooks:1']);
  assert.equal(savedResearch.country,'India');
  assert.equal(savedResearch.status,'shortlisted');
  assert.equal(savedResearch.rights.photoPlan,'reuse-needs-review');
  assert.equal(savedResearch.rights.photoCreator,'Example contributor');
  assert.equal(savedResearch.rights.textPlan,'reuse-needs-review');
  await page.locator('#world-research-query').fill('');
  await page.locator('#world-research-tag').fill('South Asian');
  await page.locator('#world-research-status').selectOption('shortlisted');
  await page.locator('#world-research-form button[type=submit]').click();
  assert.equal(await page.locator('.world-research-list li').count(),1,'source tag and private review filter intersect');
  assert.ok((await page.locator('.world-research-list').innerText()).includes('Chicken Biryani'));
  await page.locator('#world-research-tag').fill('');
  await page.locator('#world-research-status').selectOption('all');
  await page.locator('#world-research-form button[type=submit]').click();
  const reviewExport=page.waitForEvent('download');
  await page.locator('[data-action="world-review-export"]').click();
  const csv=await readFile(await (await reviewExport).path(),'utf8');
  assert.ok(csv.includes('NOT APPROVED'));
  assert.ok(csv.includes('https://example.org/culinary-origin'));
  assert.ok(csv.includes('Example contributor'));
  assert.ok(csv.includes('reuse-needs-review'));
  assert.ok(csv.includes('NOT APPROVED'));
  // A similarly titled recipe across providers is a review clue, not a confirmed duplicate.
  await page.locator('#world-research-query').fill('tomato rice');
  await page.locator('#world-research-form button[type=submit]').click();
  await page.locator('[data-action="world-research-review"]').first().click();
  await page.locator('.source-overlap-panel').waitFor();
  assert.ok((await page.locator('.source-overlap-panel').innerText()).includes('Tomato Rice'));
  assert.ok((await page.locator('.source-overlap-panel').innerText()).includes('Not confirmed duplicates'));
  assert.equal(await page.locator('.source-overlap-panel a').count(),1,'provider source is linked, not copied');
  assert.ok((await page.locator('.world-result-head').innerText()).includes('1 / 30'),
    'potential overlap detection must not change the provider count');
  const coverageDownload=page.waitForEvent('download');
  await page.locator('[data-action="world-export"]').click();
  const report=JSON.parse(await readFile(await (await coverageDownload).path(),'utf8'));
  assert.equal(report.scanComplete,true);
  assert.equal(report.cells.find(x=>x.country==='India'&&x.category==='Vegetarian').count,1);
  assert.equal(report.cells.find(x=>x.country==='India'&&x.category==='Vegetarian').recipeIds[0],'1');
  await page.locator('.site-nav [data-nav="discover"]').click();
  await page.locator('.recipe-card').first().waitFor();

  await page.locator('.recipe-card img[data-recipe-photo]').first().evaluate(image => image.dispatchEvent(new Event('error')));
  assert.equal(await page.locator('.recipe-card .image-unavailable').count(),1,'failed recipe images have a truthful placeholder');
  await page.locator('.recipe-photo').first().click();
  await page.locator('[role="dialog"] h2').getByText('Tomato Rice').waitFor();
  await page.locator('[role="dialog"] img[data-recipe-photo]').evaluate(image => image.dispatchEvent(new Event('error')));
  assert.equal(await page.locator('[role="dialog"] .dialog-photo-unavailable').count(),1,'recipe details remain usable if the source photo fails');
  assert.equal(await page.locator('.ingredient-list li').count(),2);
  await page.locator('#base-servings-input').fill('2');
  await page.locator('#original-servings-form button[type=submit]').click();
  await page.getByRole('button',{name:'Increase servings'}).click();
  assert.equal(await page.locator('[data-target-servings]').innerText(),'3');
  assert.ok((await page.locator('.ingredient-list').innerText()).includes('1.5 cup'),'rice should scale from one cup for 2 to 1.5 cups for 3');
  assert.equal(await page.getByRole('link',{name:'Watch source video'}).count(),1,'source video links are visible when provided');
  // Guided cooking persists the step and timer across dialog closing and reload.
  await page.locator('[data-action="start-cooking"]').click();
  await page.getByRole('heading',{name:'Step 1 of 2'}).waitFor();
  await page.locator('[data-action="step-next"]').click();
  await page.getByRole('heading',{name:'Step 2 of 2'}).waitFor();
  await page.locator('[data-action="timer-preset"][data-minutes="1"]').click();
  await page.locator('[data-action="timer-start"]').click();
  const initialTimer = await page.locator('[data-cooking-clock]').innerText();
  assert.match(initialTimer,/^0[01]:\d\d$/,'clock displays an active minute timer');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[role="dialog"]').count(),0);
  await page.reload();
  await page.locator('.recipe-photo').first().click();
  await page.locator('[data-action="start-cooking"]').click();
  await page.getByRole('heading',{name:'Step 2 of 2'}).waitFor();
  assert.ok((await page.locator('[data-cooking-clock]').innerText()) !== '05:00','timer survived reload');
  await page.locator('[data-action="timer-pause"]').click();
  await page.locator('[data-action="timer-reset"]').click();
  assert.equal(await page.locator('[data-cooking-clock]').innerText(),'01:00');
  await page.keyboard.press('ArrowLeft');
  await page.getByRole('heading',{name:'Step 1 of 2'}).waitFor();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('heading',{name:'Step 2 of 2'}).waitFor();
  await page.locator('[data-action="cook-done"]').click();
  await page.locator('#cooking-rating').selectOption('5');
  await page.locator('#cooking-note').fill('Lovely with extra herbs.');
  await page.locator('#cooking-log-form button[type=submit]').click();
  await page.getByText('Lovely with extra herbs.').waitFor();
  await page.locator('[data-action="favourite"]').click();
  assert.equal(await page.locator('[data-action="favourite"]').evaluate(element => element === document.activeElement), true, 'modal focus remains on saved action');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[role="dialog"]').count(),0,'dialog closes on Escape');

  await page.locator('.recipe-card [data-action="wanted"]').click();
  await page.locator('.site-nav [data-nav="library"]').click();
  await page.locator('.recipe-card').first().waitFor();
  assert.equal(await page.locator('.recipe-card').count(),1,'recipe saved');

  // Add a personal everyday recipe, edit it and prove persistence across a reload.
  await page.locator('[data-action="new-recipe"]').click();
  await page.locator('#personal-title').fill('My family curry');
  await page.locator('#personal-origin').fill('Bangladeshi');
  await page.locator('#personal-source').fill('https://example.com/traditional-family-curry');
  await page.locator('#personal-base-servings').fill('2');
  await page.locator('#personal-ingredients').fill('Rice | 1 cup\nOnion | 1');
  await page.locator('#personal-instructions').fill('Rinse the rice.\nCook with onions.');
  await page.locator('#personal-recipe-form button[type=submit]').click();
  assert.equal(await page.locator('.recipe-card').count(),2);
  await page.locator('[data-nav="library"]').first().click();
  await page.reload();
  await page.locator('.site-nav [data-nav="library"]').click();
  await page.locator('.recipe-card').first().waitFor();
  assert.equal(await page.locator('.recipe-card').count(),2,'personal cookbook persists');

  const custom = page.locator('.recipe-card').filter({hasText:'My family curry'});
  await custom.locator('.recipe-title').click();
  await page.locator('[data-action="edit-recipe"]').click();
  assert.equal(await page.locator('#personal-title').inputValue(),'My family curry');
  assert.equal(await page.locator('#personal-source').inputValue(),'https://example.com/traditional-family-curry');
  assert.equal(await page.locator('#personal-base-servings').inputValue(),'2');
  await page.locator('#personal-title').fill('My favourite family curry');
  await page.locator('#personal-recipe-form button[type=submit]').click();
  await page.getByRole('button',{name:'My favourite family curry'}).first().waitFor();
  // Tag the homemade dish, filter by its label, search, and restore a clear view.
  await page.locator('.recipe-card').filter({hasText:'My favourite family curry'}).locator('.recipe-title').click();
  await page.locator('#recipe-tag-input').fill('Weeknight');
  await page.locator('#recipe-tag-form button[type=submit]').click();
  await page.locator('.recipe-tag').getByText('Weeknight').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-action="tag-filter"][data-tag="Weeknight"]').click();
  assert.equal(await page.locator('.recipe-card').count(),1,'label filters the saved cookbook');
  await page.locator('#cookbook-query').fill('does-not-exist');
  await page.locator('#cookbook-search-form button[type=submit]').click();
  assert.equal(await page.locator('.recipe-card').count(),0,'collection search applies');
  await page.getByRole('button',{name:'Clear filters'}).click();
  assert.equal(await page.locator('.recipe-card').count(),2,'clear restores all saved dishes');


  // Expired pantry items are visible but excluded from cookability/shopping.
  await page.locator('.site-nav [data-nav="pantry"]').click();
  await page.locator('#ingredient-name').fill('Rice');
  await page.locator('#ingredient-quantity').fill('1');
  await page.locator('#ingredient-unit').selectOption('cups');
  await page.locator('#pantry-form button[type=submit]').click();
  await page.locator('#ingredient-name').fill('Onion');
  await page.locator('#ingredient-quantity').fill('1');
  await page.locator('#ingredient-expiry').fill('2020-01-01');
  await page.locator('#pantry-form button[type=submit]').click();
  assert.equal(await page.locator('.inventory-row').count(),2);
  // A second purchase with the same ingredient must be kept as its own dated batch.
  await page.getByRole('button',{name:'Add another batch of Rice'}).click();
  assert.equal(await page.locator('#ingredient-name').inputValue(),'Rice');
  await page.locator('#ingredient-quantity').fill('2');
  await page.locator('#ingredient-unit').selectOption('cups');
  const dueSoon = new Date(Date.now() + 2*24*60*60*1000).toISOString().slice(0,10);
  await page.locator('#ingredient-expiry').fill(dueSoon);
  await page.locator('#pantry-form button[type=submit]').click();
  assert.equal(await page.locator('.inventory-row').count(),3,'separate purchase is retained');
  assert.equal(await page.getByRole('button',{name:'Add another batch of Rice'}).count(),2);
  await page.getByRole('heading',{name:'Use these soon'}).waitFor();

  await page.locator('.site-nav [data-nav="plan"]').click();
  const selects=page.locator('[data-plan-day]');
  await selects.first().selectOption({label:'My favourite family curry'});
  await page.locator('[data-plan-servings]').first().fill('4');
  await page.locator('[data-plan-servings]').first().dispatchEvent('change');
  assert.equal(await page.locator('[data-plan-servings]').first().inputValue(),'4');
  assert.ok((await page.locator('aside.panel').innerText()).includes('2 pcs needed'),'onion amount must scale from 1 to 2 pieces');
  assert.ok((await page.locator('aside.panel').innerText()).includes('Onion'),'expired onion must be shopped');
  assert.ok(!(await page.locator('aside.panel .shopping-name').allTextContents()).includes('Rice'),'rice available');
  assert.equal((await page.locator('aside.panel .shopping-name').allTextContents()).length,1);
  // Actual shopping progress must survive refresh without silently editing stock.
  await page.locator('[data-shopping-recipe]').first().check();
  await page.getByText('1 of 1 picked up').waitFor();
  await page.locator('#shopping-extra-input').fill('Dish soap');
  await page.locator('#shopping-extra-form button[type=submit]').click();
  assert.equal(await page.locator('[data-shopping-extra]').count(),1);
  assert.equal(await page.locator('[data-shopping-extra]').first().isChecked(),false);
  await page.reload();
  await page.locator('.site-nav [data-nav="plan"]').click();
  assert.equal(await page.locator('[data-shopping-extra]').count(),1,'personal item survives reload');
  assert.equal(await page.locator('[data-shopping-recipe]').first().isChecked(),true,'checked recipe item survives reload');
  assert.equal((await page.locator('.shopping-name').allTextContents()).includes('Dish soap'),true);
  assert.equal((await page.locator('.inventory-row').count()),0,'shopping actions must not turn into kitchen inventory edits');

  // Backup includes user edits; it can be restored after browser storage is cleared.
  await page.locator('.site-nav [data-nav="library"]').click();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('[data-action="export-data"]').click();
  const download = await downloadEvent;
  const backupText = await readFile(await download.path(),'utf8');
  const backup = JSON.parse(backupText);
  assert.equal(backup.format,'tasteit-backup');
  assert.equal(backup.data.pantry.length,3);
  assert.equal(Object.keys(backup.data.saved).length,2);
  assert.equal(backup.data.shoppingExtras[0].name,'Dish soap');
  assert.equal(backup.data.editorialReviews['wikibooks:1'].status,'shortlisted','private research included in backup');
  assert.equal(backup.data.editorialReviews['wikibooks:1'].rights.photoPlan,'reuse-needs-review','copyright research included in backup');
  assert.equal(Object.keys(backup.data.shoppingChecked).length,1);
  assert.ok(Object.values(backup.data.saved).some(x=>x.meal.strSource === 'https://example.com/traditional-family-curry' && !x.meal.strMealThumb),'publisher link is saved without a copied image');
  assert.equal(Object.values(backup.data.planServings)[0],4,'portion preference is backed up');
  assert.ok(Object.values(backup.data.saved).some(x => x.meal.strMeal === 'My favourite family curry' && x.tags.includes('Weeknight')), 'JSON backups retain user labels');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('.site-nav [data-nav="library"]').click();
  await page.locator('[data-action="new-recipe"]').waitFor();
  assert.equal(await page.locator('.recipe-card').count(),0);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#backup-file').setInputFiles({
    name:'tasteit-backup.json',mimeType:'application/json',buffer:Buffer.from(backupText)
  });
  await page.locator('.recipe-card').first().waitFor({timeout:7000});
  assert.equal(await page.locator('.recipe-card').count(),2,'backup restore repopulates library');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tasteit.local.v1')).editorialReviews['wikibooks:1'].country),'India','research note restored');
  await page.locator('.site-nav [data-nav="plan"]').click();
  assert.equal(await page.locator('[data-shopping-extra]').count(),1,'personal shopping item restored');
  assert.equal(await page.locator('[data-shopping-recipe]').first().isChecked(),true,'recipe shopping checkmark restored');
  await page.locator('.site-nav [data-nav="library"]').click();
  const journalEntry = await page.evaluate(() => JSON.parse(localStorage.getItem('tasteit.local.v1')).saved['1']);
  assert.equal(journalEntry.cookedCount,1);
  assert.equal(journalEntry.cookingHistory[0].rating,5);
  assert.equal(journalEntry.cookingHistory[0].note,'Lovely with extra herbs.');
  assert.equal((await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('tasteit.local.v1')).cookingSessions))).length,0,'finished cooking session is cleared');
  assert.equal((await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('tasteit.local.v1')).planServings)))[0],4,'plan servings restored');

  await page.setViewportSize({width:375,height:812});
  await page.locator('.site-nav [data-nav="discover"]').click();
  await page.locator('.recipe-card').first().waitFor();
  const width = await page.evaluate(() => ({inner:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(width.scroll<=width.inner+2,'mobile should not overflow viewport: '+JSON.stringify(width));
  await page.locator('.site-nav [data-nav="pantry"]').click();
  assert.equal(await page.locator('.inventory-row').count(),3,'pantry lots restored and mobile navigation works');

  // Bulk additions require an explicit review; invalid lines cannot be silently applied.
  await page.locator('[data-action="bulk-open"]').click();
  await page.locator('#bulk-input').fill('Eggs | 4\nCarrots | 2 pcs | Fridge');
  await page.locator('#bulk-pantry-form button[type=submit]').click();
  assert.ok(await page.locator('.bulk-errors').isVisible());
  assert.equal(await page.locator('[data-action="bulk-confirm"]').count(),0);
  await page.locator('#bulk-input').fill('Rice | 9 kg\nCarrots | 2 pcs | Fridge\nCumin | 50 g | Pantry');
  await page.locator('#bulk-pantry-form button[type=submit]').click();
  assert.equal(await page.locator('.bulk-items li').count(),2);
  assert.ok((await page.locator('.bulk-preview').innerText()).includes('Rice'),'existing rice is flagged as a duplicate');
  await page.locator('#bulk-input').fill('Carrots | 2 pcs | Fridge\nCumin | 50 g | Pantry');
  assert.equal(await page.locator('[data-action="bulk-confirm"]').count(),0,'editing invalidates old preview');
  await page.locator('#bulk-pantry-form button[type=submit]').click();
  assert.equal(await page.locator('.bulk-items li').count(),2);

  await page.locator('[data-action="bulk-confirm"]').click();
  assert.equal(await page.locator('.inventory-row').count(),5);
  const inventoryAfterBulk = await page.evaluate(() => JSON.parse(localStorage.getItem('tasteit.local.v1')).pantry);
  assert.deepEqual(inventoryAfterBulk.filter(x=>x.name==='Rice').map(x=>x.quantity).sort(),['1','2'],'bulk flow must not overwrite existing batches');
  assert.equal(inventoryAfterBulk.find(x=>x.name==='Carrots').location,'Fridge');

  // Ingredient-first search must allow explicit selection without inventing cookability.
  await page.locator('[data-action="suggest"]').first().click();
  await page.getByRole('heading',{name:'Choose ingredients to search'}).waitFor();
  assert.equal(await page.locator('.kitchen-ingredient-list [aria-pressed="true"]').count(),3);
  await page.locator('.kitchen-match-reason').first().waitFor();
  const reasons = await page.locator('.kitchen-match-reason').allTextContents();
  assert.ok(reasons.some(t=>t.includes('ingredient names on hand')), 'explain why a recipe matches');
  const cumin = page.locator('[data-action="kitchen-ingredient"][data-key="cumin"]');
  await cumin.click();
  assert.equal(await page.locator('.kitchen-ingredient-list [aria-pressed="true"]').count(),2);
  assert.ok((await page.locator('.kitchen-selector-footer').innerText()).includes('Update suggestions'), 'clearly show pending changes');
  await page.locator('[data-action="kitchen-update"]').click();
  await page.locator('.kitchen-match-reason').first().waitFor();
  assert.ok(!(await page.locator('.kitchen-selector-footer').innerText()).includes('Update suggestions'), 'search reflects new selection');
  await page.locator('[data-action="kitchen-reset"]').click();
  assert.equal(await page.locator('.kitchen-ingredient-list [aria-pressed="true"]').count(),3);
  await page.locator('[data-action="kitchen-readiness"][data-readiness="names"]').click();
  await page.getByRole('heading',{name:'Nothing meets that match filter'}).waitFor();
  await page.getByRole('button',{name:'All ideas',exact:true}).click();
  await page.locator('.kitchen-match-reason').first().waitFor();
  const small = await page.evaluate(() => ({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(small.scroll<=small.inner+2,'kitchen search must remain usable on mobile');

  assert.deepEqual(errors,[],'uncaught browser errors');
  console.log('PASS '+(process.env.TASTEIT_BROWSER || 'chromium')+' browser smoke: discovery, recipe dialog, saves, personal recipes, edit, expiry, meal plan, backup, mobile viewport');
  await context.close();
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
