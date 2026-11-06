import assert from 'node:assert/strict';
import {createInterface} from 'node:readline';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {applicationAssets} from './build-site.mjs';
import {emptyStore} from '../src/model.js';
if(process.stdin.isTTY)execFileSync('stty',['-echo'],{stdio:['inherit','ignore','ignore']});
console.log('Ready for deployment verification inputs.');
const reader=createInterface({input:process.stdin,terminal:false});const config=JSON.parse(await new Promise(r=>reader.once('line',r)));reader.close();
if(process.stdin.isTTY)execFileSync('stty',['echo'],{stdio:['inherit','ignore','ignore']});
const origin=new URL(config.url).origin;
const gate=new Map();
const capture=(res,jar)=>{for(const cookie of res.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('='),key=pair.slice(0,i),value=pair.slice(i+1);if(!value||/max-age=0/i.test(cookie))jar.delete(key);else jar.set(key,value);}};
const cookie=jar=>[...jar].map(([k,v])=>k+'='+v).join('; ');
async function call(path,jar=gate,method='GET',body,extra={}){const res=await fetch(origin+path,{method,redirect:'manual',signal:AbortSignal.timeout(45000),headers:{cookie:cookie(jar),...(method==='GET'?{}:{origin,'content-type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});capture(res,jar);return res;}
if(!config.skipAssets)for(const host of config.hosts){for(const path of ['/','/data/selected-recipes.json','/api/auth']){const res=await fetch('https://'+host+path,{redirect:'manual',signal:AbortSignal.timeout(30000)});assert.ok([401,403,302,307,308].includes(res.status),'Unauthenticated access must be protected: '+host+path);assert.ok(!(await res.text()).includes('<meta name="application-name" content="Tasteit">'));}}
if(!config.skipAssets)console.log('PASS anonymous protection on every deployment/alias and static/API paths.');
let target=config.shareUrl;
for(let i=0;i<5;i++){const res=await fetch(target,{redirect:'manual',headers:{cookie:cookie(gate)},signal:AbortSignal.timeout(45000)});capture(res,gate);if(res.status===200)break;assert.ok(res.status>=300&&res.status<400,'Share access failed');target=new URL(res.headers.get('location'),target).href;assert.equal(new URL(target).origin,origin,'Share redirect must stay same-origin');}
let res=await call('/api/auth');assert.equal(res.status,200);assert.equal((await res.json()).supported,true);assert.match(res.headers.get('cache-control'),/no-store/);
const assets=await applicationAssets(process.cwd());
if(!config.skipAssets)for(const [name,asset]of Object.entries(assets)){res=await call(name==='/index.html'?'/':name);assert.equal(res.status,200,name);assert.equal(await res.text(),asset.body,name);}
res=await call('/tasteit-source.json');const source=await res.json();assert.equal(source.commit,config.commit);assert.equal(source.assetDigest,createHash('sha256').update(JSON.stringify(assets)).digest('hex'));
if(!config.skipAssets)for(const path of ['/server/supabase-client.js','/.env','/supabase/schema.sql','/package.json'])assert.equal((await call(path)).status,404,path);
if(!config.skipAssets)console.log('PASS all '+Object.keys(assets).length+' live assets, exact source/digest, no server/config source exposure.');
const clients=config.users.map(user=>({user,jar:new Map(gate)})),[a,b]=clients;
for(const c of clients){res=await call('/api/auth',c.jar,'POST',{action:'sign-in',email:c.user.email,password:c.user.password});assert.equal(res.status,200);assert.equal((await res.json()).user.id,c.user.id);assert.ok(res.headers.getSetCookie().some(v=>/httponly/i.test(v)&&/secure/i.test(v)&&/samesite=lax/i.test(v)));}
res=await call('/api/sync',a.jar);assert.equal(res.status,200);const initial=await res.json();assert.equal(initial.data,null);let revision=initial.revision;
const data={...emptyStore(),pantry:[{id:'qa-live-rice',name:'Live verification rice',quantity:'1',unit:'kg'}]};
res=await call('/api/sync',a.jar,'PUT',{accountId:a.user.id,revision,data});assert.equal(res.status,200);revision=(await res.json()).revision;
res=await call('/api/sync',b.jar);assert.equal((await res.json()).data,null);
res=await call('/api/sync',a.jar,'GET',undefined,{'oai-authenticated-user-id':b.user.id});assert.equal((await res.json()).accountId,a.user.id);
assert.equal((await call('/api/sync',a.jar,'PUT',{accountId:b.user.id,revision,data})).status,409);
const outcomes=await Promise.all([call('/api/sync',a.jar,'PUT',{accountId:a.user.id,revision,data}),call('/api/sync',a.jar,'PUT',{accountId:a.user.id,revision,data})]);assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,409]);revision++;
res=await call('/api/sync',a.jar,'DELETE',{accountId:a.user.id,revision});assert.equal(res.status,200);
assert.equal((await call('/api/sync',a.jar,'PUT',{accountId:a.user.id,revision,data})).status,409);
assert.equal((await call('/api/sync',a.jar,'PUT',{accountId:a.user.id,revision,data},{origin:'https://evil.test'})).status,403);
assert.equal((await call('/api/sync',gate,'GET',undefined,{'oai-authenticated-user-id':a.user.id})).status,401);
const revoked=new Map(a.jar);res=await call('/api/auth',a.jar,'POST',{action:'sign-out'});assert.equal(res.status,200);assert.equal((await call('/api/sync',a.jar)).status,401);assert.equal((await call('/api/sync',revoked)).status,401);
console.log('PASS deployed real sign-in/cookies/isolation, spoof/wrong-origin denial, competing revisions, tombstone and revoked session. No email sent.');
process.exit(0);
