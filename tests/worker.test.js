import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from '../server/worker.js';
test('Worker serves only prepared assets and keeps the authenticated sync boundary',async()=>{
  const app=createWorker({'/index.html':{body:'Tasteit',type:'text/html'},'/sw.js':{body:'worker',type:'text/javascript'}});
  assert.equal(await (await app.fetch(new Request('https://test/?view=library'),{})).text(),'Tasteit');
  assert.equal((await app.fetch(new Request('https://test/api/sync'),{})).status,401);
  assert.equal((await app.fetch(new Request('https://test/.openai/hosting.json'),{})).status,404);
  assert.equal((await app.fetch(new Request('https://test/sw.js'),{})).headers.get('service-worker-allowed'),'/');
});
