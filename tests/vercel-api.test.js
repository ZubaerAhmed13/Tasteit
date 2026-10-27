import test from 'node:test';import assert from 'node:assert/strict';import {emptyStore} from '../src/model.js';
const origin='https://tasteit.example',uid='11111111-1111-4111-8111-111111111111';
const user={id:uid,email:'owner@example.test',email_confirmed_at:'2026-10-27T00:00:00Z',is_anonymous:false};
const request=(method='GET',body,headers={},route='sync')=>new Request(origin+'/api/'+route,{method,headers:{...(method==='GET'?{}:{origin,'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
function boundary({identity=user,row=null,conflict=false,error=null}={}) {
 const calls=[];
 const client={auth:{async getUser(){calls.push('identity');return {data:{user:identity},error};},async signInWithPassword(input){calls.push(['signin',input.email]);return {data:{user:identity,session:{access_token:'never return',refresh_token:'never return'}},error};},async signUp(input){calls.push(['signup',input.email,input.options?.emailRedirectTo]);return {data:{user:null,session:null},error};},async signOut(input){calls.push(['signout',input.scope]);return {error};},async exchangeCodeForSession(){return {error};}},from(table){calls.push(['table',table]);return {select(){return this;},eq(key,value){calls.push(['owner',key,value]);return this;},async maybeSingle(){return {data:row,error};}};},async rpc(name,input){calls.push(['rpc',name,input]);return {data:conflict?[]:[{revision:2,updated_at:'2026-10-27T00:00:00Z'}],error};}};
 return {calls,session:()=>({client,finish:response=>response})};
}
async function handlers(){const [s,a]=await Promise.all([import('../server/vercel-sync.js').catch(()=>({})),import('../server/vercel-auth.js').catch(()=>({}))]);assert.equal(typeof s.handleVercelSync,'function');assert.equal(typeof a.handleVercelAuth,'function');return {...s,...a};}
test('Vercel ignores spoofed Sites identity and rejects absent unconfirmed or anonymous sessions',async()=>{
 const {handleVercelSync}=await handlers();for(const identity of [null,{...user,email_confirmed_at:null},{...user,is_anonymous:true}]){const deps=boundary({identity});const res=await handleVercelSync(request('GET',undefined,{'oai-authenticated-user-id':uid}),deps);assert.equal(res.status,401);assert.deepEqual(deps.calls,['identity']);}
});
test('Vercel reads only the verified account and returns uncached snapshots',async()=>{
 const {handleVercelSync}=await handlers(),data=emptyStore(),deps=boundary({row:{revision:3,payload:data,updated_at:'2026-10-27T00:00:00Z'}});
 const res=await handleVercelSync(request('GET',undefined,{'oai-authenticated-user-id':'attacker'}),deps);assert.equal(res.status,200);const result=await res.json();assert.equal(result.accountId,uid);assert.equal(result.revision,3);assert.deepEqual(result.data,data);assert.equal(res.headers.get('cache-control'),'private, no-store');assert.ok(deps.calls.some(x=>Array.isArray(x)&&x[0]==='owner'&&x[2]===uid));
});
test('Vercel writes retain origin account size and backup validation before RPC',async()=>{
 const {handleVercelSync}=await handlers();
 for(const [body,headers,status]of [[{accountId:uid,revision:0,data:emptyStore()},{origin:'https://other.test'},403],[{accountId:'other',revision:0,data:emptyStore()},{},409],[{accountId:uid,revision:-1,data:emptyStore()},{},400],[{accountId:uid,revision:0,data:{bad:true}},{},400],[{accountId:uid,revision:0,data:emptyStore()},{'content-type':'text/plain'},400],['x'.repeat(2_000_001),{},413]]){const deps=boundary(),res=await handleVercelSync(request('PUT',body,headers),deps);assert.equal(res.status,status);assert.equal(deps.calls.some(x=>Array.isArray(x)&&x[0]==='rpc'),false);}
});
test('Vercel atomic writes and deletion tombstones pass only the current revision',async()=>{
 const {handleVercelSync}=await handlers();for(const method of ['PUT','DELETE']){const deps=boundary();const res=await handleVercelSync(request(method,{accountId:uid,revision:1,data:emptyStore()}),deps);assert.equal(res.status,200);const call=deps.calls.find(x=>Array.isArray(x)&&x[0]==='rpc');assert.equal(call[1],'tasteit_write_snapshot');assert.deepEqual(call[2],{expected_revision:1,snapshot:method==='PUT'?emptyStore():null});assert.equal('account_id' in call[2],false);}
 const deps=boundary({conflict:true});assert.equal((await handleVercelSync(request('PUT',{accountId:uid,revision:1,data:emptyStore()}),deps)).status,409);
});
test('auth provider errors and damaged cloud snapshots never look like an empty cookbook',async()=>{
 const {handleVercelSync}=await handlers();for(const options of [{error:{status:503}},{row:{revision:1,payload:{bad:true}}}]){const res=await handleVercelSync(request(),boundary(options));assert.equal(res.status,503);assert.equal('data' in await res.json(),false);}
});
test('account endpoints advertise Vercel capability without exposing credentials',async()=>{
 const {handleVercelAuth}=await handlers();let deps=boundary(),res=await handleVercelAuth(request('GET',undefined,{},'auth'),deps);assert.deepEqual(await res.json(),{supported:true,user:{id:uid,email:user.email}});
 deps=boundary();res=await handleVercelAuth(request('POST',{action:'sign-in',email:user.email,password:'correct horse battery staple'},{},'auth'),deps);assert.equal(res.status,200);const text=await res.text();assert.ok(!text.includes('access_token')&&!text.includes('refresh_token'));assert.equal(res.headers.get('cache-control'),'private, no-store');
});
test('account mutations require same-origin JSON and return generic failures',async()=>{
 const {handleVercelAuth}=await handlers();for(const headers of [{origin:'https://evil.test'},{'content-type':'text/plain'}]){const deps=boundary();const res=await handleVercelAuth(request('POST',{action:'sign-in',email:user.email,password:'correct horse battery staple'},headers,'auth'),deps);assert.ok([400,403].includes(res.status));assert.equal(deps.calls.length,0);}
 const res=await handleVercelAuth(request('POST',{action:'sign-in',email:user.email,password:'correct horse battery staple'},{},'auth'),boundary({error:{status:400,message:'secret detailed auth error'}}));assert.equal(res.status,400);assert.ok(!(await res.text()).includes('secret detailed'));
});
test('signup confirmation and callbacks use only this origin; sign-out is local',async()=>{
 const {handleVercelAuth}=await handlers();const deps=boundary();const signup=await handleVercelAuth(request('POST',{action:'sign-up',email:user.email,password:'correct horse battery staple'},{},'auth'),deps);assert.equal(signup.status,200);assert.ok(deps.calls.some(x=>Array.isArray(x)&&x[0]==='signup'&&x[2]===origin+'/api/auth'));const out=await handleVercelAuth(request('POST',{action:'sign-out'},{},'auth'),deps);assert.equal(out.status,200);assert.ok(deps.calls.some(x=>Array.isArray(x)&&x[0]==='signout'&&x[1]==='local'));
 const callback=await handleVercelAuth(new Request(origin+'/api/auth?code=abc&next=https://evil.test'),deps);assert.equal(callback.status,303);assert.equal(new URL(callback.headers.get('location')).origin,origin);
});
