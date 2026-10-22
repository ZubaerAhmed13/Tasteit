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
  strSource: 'https://www.themealdb.com/'
};
const headers = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    const allowed = new Set(['index.html','styles.css','favicon.svg','src/app.js','src/api.js','src/model.js']);
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
  await page.locator('.recipe-card').first().waitFor({timeout:12000});
  assert.equal(await page.locator('.recipe-card').count(),1,'live discovery card from fixture');
  await page.locator('.recipe-photo').first().click();
  await page.locator('[role="dialog"] h2').getByText('Tomato Rice').waitFor();
  assert.equal(await page.locator('.ingredient-list li').count(),2);
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
  await page.locator('#personal-title').fill('My favourite family curry');
  await page.locator('#personal-recipe-form button[type=submit]').click();
  await page.getByRole('button',{name:'My favourite family curry'}).first().waitFor();

  // Expired pantry items are visible but excluded from cookability/shopping.
  await page.locator('.site-nav [data-nav="pantry"]').click();
  await page.locator('#ingredient-name').fill('Rice');
  await page.locator('#ingredient-quantity').fill('1');
  await page.locator('#pantry-form button[type=submit]').click();
  await page.locator('#ingredient-name').fill('Onion');
  await page.locator('#ingredient-quantity').fill('1');
  await page.locator('#ingredient-expiry').fill('2020-01-01');
  await page.locator('#pantry-form button[type=submit]').click();
  assert.equal(await page.locator('.inventory-row').count(),2);

  await page.locator('.site-nav [data-nav="plan"]').click();
  const selects=page.locator('[data-plan-day]');
  await selects.first().selectOption({label:'My favourite family curry'});
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
  assert.equal(backup.data.pantry.length,2);
  assert.equal(Object.keys(backup.data.saved).length,2);
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

  await page.setViewportSize({width:375,height:812});
  await page.locator('.site-nav [data-nav="discover"]').click();
  await page.locator('.recipe-card').first().waitFor();
  const width = await page.evaluate(() => ({inner:window.innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(width.scroll<=width.inner+2,'mobile should not overflow viewport: '+JSON.stringify(width));
  await page.locator('.site-nav [data-nav="pantry"]').click();
  assert.equal(await page.locator('.inventory-row').count(),2,'pantry restored and mobile navigation works');
  assert.deepEqual(errors,[],'uncaught browser errors');
  console.log('PASS browser smoke: discovery, recipe dialog, saves, personal recipes, edit, expiry, meal plan, backup, mobile viewport');
  await context.close();
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
