import test from 'node:test';import assert from 'node:assert/strict';
async function module(){const m=await import('../src/host-auth.js').catch(()=>({}));assert.equal(typeof m.createHostAuth,'function');return m;}
test('old host without account endpoint retains its existing cloud flow',async()=>{const {createHostAuth,accountMarkup}=await module();const auth=createHostAuth({fetch:async()=>new Response('Not found',{status:404})});await auth.refresh();assert.equal(auth.state.supported,false);assert.equal(accountMarkup(auth.state),'');});
test('account requests stay same-origin and only sanitized identity enters client state',async()=>{
 const {createHostAuth}=await module(),calls=[];const auth=createHostAuth({fetch:async(url,options)=>{calls.push({url,options});return Response.json({supported:true,user:{id:'user-a',email:'a@example.test'},access_token:'must not retain',refresh_token:'must not retain'});}});
 await auth.submit('sign-in',{email:'a@example.test',password:'a sufficiently long password'});assert.equal(calls[0].url,'/api/auth');assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.redirect,'error');assert.deepEqual(auth.state.user,{id:'user-a',email:'a@example.test'});assert.ok(!JSON.stringify(auth.state).includes('token'));
});
test('unavailable account requests and stalled response bodies are bounded',async()=>{
 const {createHostAuth}=await module();const auth=createHostAuth({timeoutMs:10,fetch:async()=>({status:200,ok:true,json:()=>new Promise(()=>{})})});await auth.submit('sign-in',{email:'a@example.test',password:'long enough password'});assert.equal(auth.state.loading,false);assert.equal(auth.state.user,null);assert.ok(auth.state.message);
});
test('late account status cannot replace a newer completed sign-in',async()=>{
 const {createHostAuth}=await module();let release;const auth=createHostAuth({fetch:async(_url,options)=>options.method==='POST'?Response.json({supported:true,user:{id:'new',email:'new@example.test'}}):await new Promise(r=>release=r)});const pending=auth.refresh();await auth.submit('sign-in',{email:'new@example.test',password:'long enough password'});release(Response.json({supported:true,user:null}));await pending;assert.equal(auth.state.user.id,'new');
});
test('account markup escapes identity and exposes sign-in sign-up and local sign-out',async()=>{
 const {accountMarkup}=await module();const anonymous=accountMarkup({supported:true,user:null,loading:false,message:'Try again'});assert.match(anonymous,/sync-account-form/);assert.match(anonymous,/value="sign-up"/);assert.match(anonymous,/type="password"/);const signed=accountMarkup({supported:true,user:{id:'a',email:'<img src=x>'}});assert.ok(!signed.includes('<img'));assert.match(signed,/account-sign-out/);
});
test('account capability survives service errors and success is explicit',async()=>{
 const {createHostAuth}=await module();let fail=true;const auth=createHostAuth({fetch:async()=>fail?Response.json({supported:true,error:'Temporarily unavailable'},{status:503}):Response.json({supported:true,user:null})});
 await auth.refresh();assert.equal(auth.state.supported,true);assert.equal(auth.state.succeeded,false);
 fail=false;await auth.submit('sign-out');assert.equal(auth.state.succeeded,true);
 fail=true;await auth.submit('sign-out');assert.equal(auth.state.succeeded,false);
});
