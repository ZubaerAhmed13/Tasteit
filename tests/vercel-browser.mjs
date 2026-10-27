import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {chromium,firefox,webkit} from 'playwright';
import {applicationAssets} from '../scripts/build-site.mjs';
import {nodeHandler} from '../server/vercel-http.js';
import {handleVercelAuth} from '../server/vercel-auth.js';
import {handleVercelSync} from '../server/vercel-sync.js';
import {emptyStore} from '../src/model.js';
const user={id:'fixture-owner',email:'owner@example.test',email_confirmed_at:'2026-10-27',is_anonymous:false};
let cloud=null,writes=0;
// Only this local fixture issues the test cookie; production uses the real SDK.
function session(request){let signed=/tasteit_fixture=owner/.test(request.headers.get('cookie')||''),cookie;
 const client={auth:{getUser:async()=>({data:{user:signed?user:null},error:null}),
  signInWithPassword:async({password})=>{if(password!=='correct password 123')return {error:{}};signed=true;cookie='tasteit_fixture=owner; HttpOnly; SameSite=Lax; Path=/';return {data:{session:{}},error:null};},
  signUp:async()=>({data:{session:null},error:null}),signOut:async()=>{signed=false;cookie='tasteit_fixture=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';return {error:null};}},
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:cloud,error:null})})})}),
  rpc:async(_name,args)=>{if((cloud?.revision||0)!==args.expected_revision)return {data:[],error:null};cloud={revision:(cloud?.revision||0)+1,payload:args.snapshot,updated_at:new Date().toISOString()};writes++;return {data:[cloud],error:null};}};
 return {client,finish:response=>{if(cookie)response.headers.append('set-cookie',cookie);return response;}};
}
const assets=await applicationAssets(),auth=nodeHandler(r=>handleVercelAuth(r,{session})),sync=nodeHandler(r=>handleVercelSync(r,{session}));
const server=createServer(async(req,res)=>{
 if(req.url.startsWith('/api/auth'))return auth(req,res);
 if(req.url==='/api/sync')return sync(req,res);
 const file=assets[new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html')];
 res.writeHead(file?200:404,{'content-type':file?.type||'text/plain'});res.end(file?.body||'Not found');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await ({chromium,firefox,webkit}[process.env.TASTEIT_BROWSER||'chromium']).launch({headless:true});
 const context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(seed=>{if(!localStorage.getItem('tasteit.local.v1'))localStorage.setItem('tasteit.local.v1',JSON.stringify(seed));},{...emptyStore(),shoppingExtras:[{id:'manual-extra',name:'Keep my rice',checked:false}]});
 await page.route('**/api/json/v1/1/**',route=>route.fulfill({json:{meals:[]}}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?view=library');
 const form=page.locator('#sync-account-form');await form.waitFor();
 await form.locator('[name=email]').fill(user.email);await form.locator('[name=password]').fill('wrong password 123');
 await form.locator('[value=sign-in]').click();await page.getByRole('status').filter({hasText:'Could not sign in'}).waitFor();
 assert.equal(writes,0);await form.locator('[name=password]').fill('correct password 123');
 await form.locator('[value=sign-up]').click();await page.getByRole('status').filter({hasText:'Check your email'}).waitFor();
 await form.locator('[name=password]').fill('correct password 123');await form.locator('[value=sign-in]').click();
 await page.getByText('Signed in as').waitFor();assert.equal(writes,0,'sign-in does not upload');
 assert.equal(await page.evaluate(()=>localStorage.getItem('tasteit.sync-consent.v1')),null);
 await page.locator('#sync-enable').click();await page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent==='Synced');assert.equal(writes,1);
 await page.locator('[data-action=account-sign-out]').click();await form.waitFor();await page.locator('#sync-enable').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tasteit.local.v1')).shoppingExtras[0].name),'Keep my rice');
 assert.equal(await page.evaluate(()=>document.cookie.includes('tasteit_fixture')),false);
 await page.reload();await form.waitFor();assert.equal(writes,1,'sign-out and reload do not upload');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('PASS Vercel account: Node transport, errors, confirmation notice, explicit sync, sign-out, retained local kitchen, mobile.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
