// Headless browser acceptance for Tasteit. API responses are intentionally
// fixture-backed: the test verifies UI behaviour independently of TheMealDB uptime.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

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
    const allowed = new Set(['index.html','styles.css','favicon.svg','src/app.js','src/api.js','src/model.js','src/quantities.js','src/organise.js','src/pantry-bulk.js','src/pantry-batches.js','src/servings.js','src/kitchen-discovery.js','src/cooking.js']);
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
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1300,height:900},acceptDownloads:true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.route('**/api/json/v1/1/**', async route => {
    const u = new URL(route.request().url());
    const endpoint = u.pathname.split('/').pop();
    const body = endpoint === 'lookup.php' ? {meals:[meal]} :
      endpoint === 'filter.php' ? {meals:[{ idMeal:meal.idMeal, strMeal:meal.strMeal, strMealThumb:meal.strMealThumb }]} :
      {meals:[meal]};
    await route.fulfill({status:200,headers,body:JSON.stringify(body)});
  });
  await page.route('**/images/media/meals/**', route => route.fulfill({
    status:200,contentType:'image/svg+xml',
    body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect width="200" height="140" fill="#dde7cf"/></svg>'
  }));

  await page.goto(url);
  await page.locator('.recipe-card').first().waitFor({timeout:12000}).catch(async error => { throw new Error(error.message + '\nBrowser errors: ' + JSON.stringify(errors) + '\nPage snapshot: ' + (await page.locator('#app').innerText()).slice(0,900)); });
  assert.equal(await page.locator('.recipe-card').count(),1,'live discovery card from fixture');
  await page.locator('[data-action="course"][data-course="Vegetarian"]').click();
  await page.locator('.recipe-card').first().waitFor();
  assert.ok((await page.locator('h2').allTextContents()).some(x=>x.includes('Vegetarian')),'provider category filter opens');
  await page.locator('[data-action="course"][data-course="All"]').click();
  await page.locator('.recipe-card').first().waitFor();
  await page.locator('[data-action="letter"][data-letter="A"]').click();
  await page.locator('.recipe-card').first().waitFor();
  assert.ok((await page.locator('h2').allTextContents()).some(x=>x.includes('Recipes beginning with A')),'alphabetical discovery opens');
  await page.locator('[data-action="surprise"]').click();
  await page.locator('[role="dialog"] h2').getByText('Tomato Rice').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[data-action="area"][data-area="All"]').click();
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
  console.log('PASS browser smoke: discovery, recipe dialog, saves, personal recipes, edit, expiry, meal plan, backup, mobile viewport');
  await context.close();
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
