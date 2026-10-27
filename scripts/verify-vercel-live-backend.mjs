// Explicit live probes against the dedicated backend. Credentials arrive only on hidden stdin.
import assert from 'node:assert/strict';import {createInterface} from 'node:readline';import {execFileSync} from 'node:child_process';
import {createSession} from '../server/supabase-client.js';import {handleVercelAuth} from '../server/vercel-auth.js';import {handleVercelSync} from '../server/vercel-sync.js';import {emptyStore} from '../src/model.js';
if(process.stdin.isTTY)execFileSync('stty',['-echo'],{stdio:['inherit','ignore','ignore']});
console.log('Ready for isolated backend verification credentials.');
const reader=createInterface({input:process.stdin,terminal:false});const config=JSON.parse(await new Promise(r=>reader.once('line',r)));reader.close();
if(process.stdin.isTTY)execFileSync('stty',['echo'],{stdio:['inherit','ignore','ignore']});
const origin='https://tasteit.example',env={SUPABASE_URL:config.url,SUPABASE_PUBLISHABLE_KEY:config.key},deps={session:req=>createSession(req,env)};
const clients=config.users.map(user=>({user,cookies:new Map()}));
async function call(client,route,method='GET',body,extra={}) {
 const headers={cookie:[...client.cookies].map(([k,v])=>k+'='+v).join('; '),...(method==='GET'?{}:{origin,'content-type':'application/json'}),...extra};
 const request=new Request(origin+'/api/'+route,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
 const response=await(route==='auth'?handleVercelAuth(request,deps):handleVercelSync(request,deps));
 for(const cookie of response.headers.getSetCookie()) {const pair=cookie.split(';')[0],index=pair.indexOf('='),name=pair.slice(0,index),value=pair.slice(index+1);if(/max-age=0/i.test(cookie)||!value)client.cookies.delete(name);else client.cookies.set(name,value);}
 return response;
}
const [a,b]=clients;
for(const c of clients){const res=await call(c,'auth','POST',{action:'sign-in',email:c.user.email,password:c.user.password});assert.equal(res.status,200);const cookies=res.headers.getSetCookie();assert.ok(cookies.length);assert.ok(cookies.every(v=>/HttpOnly/i.test(v)&&/Secure/i.test(v)&&/SameSite=Lax/i.test(v)));const result=await res.json();assert.equal(result.user.id,c.user.id);assert.ok(!('session' in result));}
console.log('PASS real sign-in, verified user and HTTP-only secure cookies; no email sent.');
let res=await call(a,'sync');assert.equal(res.status,200);assert.equal((await res.json()).data,null);
const data={...emptyStore(),pantry:[{id:'qa-rice',name:'QA rice',quantity:'1',unit:'kg'}]};
res=await call(a,'sync','PUT',{accountId:a.user.id,revision:0,data});assert.equal(res.status,200);
res=await call(b,'sync');assert.equal((await res.json()).data,null);
res=await call(a,'sync','GET',undefined,{'oai-authenticated-user-id':b.user.id});assert.equal((await res.json()).accountId,a.user.id);
const competing=await Promise.all([call(a,'sync','PUT',{accountId:a.user.id,revision:1,data}),call(a,'sync','PUT',{accountId:a.user.id,revision:1,data})]);assert.deepEqual(competing.map(r=>r.status).sort(),[200,409]);
res=await call(a,'sync','DELETE',{accountId:a.user.id,revision:2});assert.equal(res.status,200);
res=await call(a,'sync','PUT',{accountId:a.user.id,revision:2,data});assert.equal(res.status,409);
res=await call(a,'sync');let value=await res.json();assert.equal(value.revision,3);assert.equal(value.data,null);
assert.equal((await call(a,'sync','PUT',{accountId:a.user.id,revision:3,data},{origin:'https://evil.test'})).status,403);
assert.equal((await call({cookies:new Map()},'sync','GET',undefined,{'oai-authenticated-user-id':a.user.id})).status,401);
console.log('PASS real account isolation, spoof rejection, transactional competing writes and deletion tombstones.');
const oldSession={...a,cookies:new Map(a.cookies)};
res=await call(a,'auth','POST',{action:'sign-out'});assert.equal(res.status,200);assert.equal((await call(a,'sync')).status,401);
assert.equal((await call(oldSession,'sync')).status,401,'revoked session must not read cloud data');
console.log('PASS real local sign-out clears cookies and rejects a revoked session.');
process.exit(0);
