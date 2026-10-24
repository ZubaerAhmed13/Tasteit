import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStore} from '../src/model.js';
import {sqliteD1} from './helpers/sqlite-d1.js';
import {handleSync} from '../server/sync-api.js';
const kitchen=name=>({...emptyStore(),pantry:[{id:name,name,quantity:'1',unit:'pcs'}]});
async function device(DB,initial=emptyStore(),options={}) {
  const {createCloudSync}=await import('../src/cloud-sync.js');
  let local=structuredClone(initial),meta=null,consent=null,account='a',online=true,writable=true;
  const states=[];
  const sync=createCloudSync({readLocal:()=>local,writeLocal:data=>{if(!writable)return false;local=structuredClone(data);return true;},
    readMeta:()=>meta,writeMeta:data=>{meta=structuredClone(data);return true;},readConsent:()=>consent,writeConsent:value=>{consent=value;return true;},isOnline:()=>online,onState:s=>states.push(s),
    fetch:(url,init={})=>handleSync(new Request('https://tasteit.test'+url,{...init,headers:{...init.headers,'oai-authenticated-user-id':account,origin:'https://tasteit.test'}}),{DB}),...options});
  return {sync,states,get local(){return local;},get meta(){return meta;},edit:data=>{local=data;},account:id=>{account=id;},online:v=>{online=v;},writable:v=>{writable=v;}};
}
test('cloud sync stays off until consent and first sync uploads without changing local records',async()=>{
  const DB=sqliteD1();try {
    const a=await device(DB,kitchen('Rice'));
    await a.sync.sync();assert.equal((await handleSync(new Request('https://tasteit.test/api/sync',{headers:{'oai-authenticated-user-id':'a'}}),{DB})).status,200);
    assert.equal(a.sync.state.status,'off');
    await a.sync.connect();assert.equal(a.sync.state.status,'synced');assert.equal(a.meta.revision,1);
    const b=await device(DB);await b.sync.connect();assert.equal(b.local.pantry[0].name,'Rice');
    assert.equal(b.sync.state.status,'synced');
  } finally {DB.close();}
});
test('two independently changed copies require a choice and preserve both until resolution',async()=>{
  const DB=sqliteD1();try {
    const a=await device(DB,kitchen('Rice'));await a.sync.connect();
    const b=await device(DB);await b.sync.connect();
    a.edit(kitchen('Tomato'));await a.sync.sync();
    b.edit(kitchen('Potato'));await b.sync.sync();
    assert.equal(b.sync.state.status,'conflict');assert.equal(b.local.pantry[0].name,'Potato');
    await b.sync.resolve('remote');assert.equal(b.local.pantry[0].name,'Tomato');
    assert.equal(b.sync.state.status,'synced');
  } finally {DB.close();}
});
test('initial differing data and account switches never upload automatically',async()=>{
  const DB=sqliteD1();try {
    const a=await device(DB,kitchen('Rice'));await a.sync.connect();
    const b=await device(DB,kitchen('Potato'));await b.sync.connect();assert.equal(b.sync.state.status,'conflict');
    await b.sync.resolve('local');assert.equal(b.sync.state.status,'synced');
    b.account('different-account');b.edit(kitchen('Milk'));await b.sync.sync();
    assert.equal(b.sync.state.status,'account-changed');
    const other=await device(DB);other.account('different-account');await other.sync.connect();
    assert.equal(other.local.pantry.length,0);
  } finally {DB.close();}
});
test('offline edits and a failed local restore remain recoverable',async()=>{
  const DB=sqliteD1();try {
    const a=await device(DB,kitchen('Rice'));await a.sync.connect();
    const b=await device(DB);await b.sync.connect();
    a.edit(kitchen('Tomato'));await a.sync.sync();b.writable(false);await b.sync.sync();
    assert.equal(b.sync.state.status,'error');assert.equal(b.local.pantry[0].name,'Rice');
    b.writable(true);await b.sync.sync();assert.equal(b.local.pantry[0].name,'Tomato');
    b.online(false);b.edit(kitchen('Potato'));await b.sync.sync();assert.equal(b.sync.state.status,'offline');
    b.online(true);await b.sync.sync();assert.equal(b.sync.state.status,'synced');
    await a.sync.sync();assert.equal(a.local.pantry[0].name,'Potato');
  } finally {DB.close();}
});
test('edits during an upload are not marked as synced or overwritten',async()=>{
  const DB=sqliteD1();try {
    let release,arrived;const started=new Promise(r=>{arrived=r;});let held=true;
    const a=await device(DB,kitchen('Rice'),{fetch:async(url,init={})=>{
      if(init.method==='PUT'&&held){arrived();await new Promise(r=>{release=r;});held=false;}
      return handleSync(new Request('https://tasteit.test'+url,{...init,headers:{...init.headers,'oai-authenticated-user-id':'a',origin:'https://tasteit.test'}}),{DB});
    }});
    const running=a.sync.connect();await started;a.edit(kitchen('Potato'));release();await running;
    assert.equal(a.local.pantry[0].name,'Potato');assert.equal(a.sync.state.status,'pending');
    await a.sync.sync();assert.equal(a.sync.state.status,'synced');
    const b=await device(DB);await b.sync.connect();assert.equal(b.local.pantry[0].name,'Potato');
  } finally {DB.close();}
});
test('stale conflict choices and cloud removal cannot erase a browser copy',async()=>{
  const DB=sqliteD1();try {
    const a=await device(DB,kitchen('Rice'));await a.sync.connect();
    const b=await device(DB,kitchen('Potato'));await b.sync.connect();
    b.edit(kitchen('Carrot'));await b.sync.resolve('remote');assert.equal(b.local.pantry[0].name,'Carrot');
    assert.notEqual(b.sync.state.status,'synced');
    await a.sync.removeCloud();assert.equal(a.local.pantry[0].name,'Rice');assert.equal(a.sync.state.status,'off');
    await b.sync.sync();assert.equal(b.local.pantry[0].name,'Carrot');assert.equal(b.sync.state.status,'conflict');
    b.sync.disconnect();assert.equal(b.local.pantry[0].name,'Carrot');
  } finally {DB.close();}
});
test('turning sync off during a read prevents any subsequent upload',async()=>{
  const DB=sqliteD1();try {
    let release,arrived,uploads=0;const started=new Promise(r=>{arrived=r;});
    const a=await device(DB,kitchen('Rice'),{fetch:async(url,init={})=>{
      if(init.method==='GET'){arrived();await new Promise(r=>{release=r;});}
      if(init.method==='PUT')uploads++;
      return handleSync(new Request('https://tasteit.test'+url,{...init,headers:{...init.headers,'oai-authenticated-user-id':'a',origin:'https://tasteit.test'}}),{DB});
    }});
    const running=a.sync.connect();await started;a.sync.disconnect();release();await running;
    assert.equal(uploads,0);assert.equal(a.sync.state.status,'off');
  } finally {DB.close();}
});
test('sync settings changed by another tab are adopted before further writes',async()=>{
  const DB=sqliteD1();try {
    let shared=null,consent=null;const settings={readMeta:()=>shared,writeMeta:value=>{shared=structuredClone(value);return true;},readConsent:()=>consent,writeConsent:value=>{consent=value;return true;}};
    const a=await device(DB,kitchen('Rice'),settings);await a.sync.connect();
    const b=await device(DB,kitchen('Rice'),settings);await b.sync.sync();
    a.sync.disconnect();await b.sync.refresh();b.edit(kitchen('Potato'));await b.sync.sync();
    assert.equal(b.sync.state.status,'off');
    const c=await device(DB);await c.sync.connect();assert.equal(c.local.pantry[0].name,'Rice');
  } finally {DB.close();}
});
test('an older cloud response cannot roll a device back below its known revision',async()=>{
  const DB=sqliteD1();try {
    let stale=false;
    const a=await device(DB,kitchen('Rice'),{fetch:(url,init={})=>stale&&init.method==='GET'
      ?Promise.resolve(Response.json({accountId:'a',revision:0,updatedAt:null,data:emptyStore()}))
      :handleSync(new Request('https://tasteit.test'+url,{...init,headers:{...init.headers,'oai-authenticated-user-id':'a',origin:'https://tasteit.test'}}),{DB})});
    await a.sync.connect();stale=true;await a.sync.sync();
    assert.equal(a.local.pantry[0].name,'Rice');assert.equal(a.sync.state.status,'error');
  } finally {DB.close();}
});
test('an account switch between checking and uploading cannot copy records to the new account',async()=>{
  const DB=sqliteD1();try {
    const a=await device(DB,kitchen('Private rice'),{fetch:(url,init={})=>handleSync(new Request('https://tasteit.test'+url,
      {...init,headers:{...init.headers,'oai-authenticated-user-id':init.method==='PUT'?'b':'a',origin:'https://tasteit.test'}}),{DB})});
    await a.sync.connect();
    const b=await device(DB);b.account('b');await b.sync.connect();
    assert.equal(b.local.pantry.length,0);
  } finally {DB.close();}
});
test('the first observed account stays bound even if the initial attempt needs conflict review',async()=>{
  const DB=sqliteD1();try {
    const a=await device(DB,kitchen('Cloud A'));await a.sync.connect();
    const b=await device(DB,kitchen('Private A'));await b.sync.connect();assert.equal(b.sync.state.status,'conflict');
    b.account('b');await b.sync.sync();assert.equal(b.sync.state.status,'account-changed');
    const other=await device(DB);other.account('b');await other.sync.connect();assert.equal(other.local.pantry.length,0);
  } finally {DB.close();}
});
test('an accepted upload acknowledgement cannot re-enable consent revoked in another tab',async()=>{
  const DB=sqliteD1();try {
    let progress=null,consent=null,release,arrived;const started=new Promise(r=>{arrived=r;});
    const shared={readMeta:()=>progress,writeMeta:value=>{progress=structuredClone(value);return true;},readConsent:()=>consent,writeConsent:value=>{consent=value;return true;}};
    const a=await device(DB,kitchen('Rice'),{...shared,fetch:async(url,init={})=>{
      const response=await handleSync(new Request('https://tasteit.test'+url,{...init,headers:{...init.headers,'oai-authenticated-user-id':'a',origin:'https://tasteit.test'}}),{DB});
      if(init.method==='PUT'){arrived();await new Promise(r=>{release=r;});}return response;
    }});
    const running=a.sync.connect();await started;
    const b=await device(DB,kitchen('Rice'),shared);b.sync.disconnect();release();await running;
    await a.sync.refresh();assert.equal(consent,null);assert.equal(a.sync.state.status,'off');
  } finally {DB.close();}
});
test('an unreadable browser store must not be uploaded as an empty snapshot',async()=>{
  const {readStoreStrict}=await import('../src/model.js');
  assert.deepEqual(readStoreStrict({getItem:()=>null}),emptyStore());
  for(const raw of ['null','{}','bad json',JSON.stringify({...emptyStore(),pantry:'broken'})])assert.throws(()=>readStoreStrict({getItem:()=>raw}));
  const DB=sqliteD1();try {
    let broken=false;const a=await device(DB,kitchen('Rice'),{readLocal:()=>broken
      ?readStoreStrict({getItem(){throw new Error('Storage unavailable');}}):kitchen('Rice')});
    await a.sync.connect();broken=true;await a.sync.sync();assert.equal(a.sync.state.status,'error');
    const b=await device(DB);await b.sync.connect();assert.equal(b.local.pantry[0].name,'Rice');
  } finally {DB.close();}
});
test('changes during a busy upload schedule one automatic follow-up after it finishes',async()=>{
  const DB=sqliteD1();try {
    let held=false,release,arrived,puts=0;const started=new Promise(r=>{arrived=r;});
    const a=await device(DB,kitchen('Rice'),{fetch:async(url,init={})=>{
      if(init.method==='PUT'){puts++;if(held){arrived();await new Promise(r=>{release=r;});held=false;}}
      return handleSync(new Request('https://tasteit.test'+url,{...init,headers:{...init.headers,'oai-authenticated-user-id':'a',origin:'https://tasteit.test'}}),{DB});
    }});
    await a.sync.connect();held=true;a.edit(kitchen('Tomato'));const running=a.sync.sync();await started;
    a.edit(kitchen('Potato'));a.sync.changed();await new Promise(r=>setTimeout(r,750));release();await running;
    await new Promise(r=>setTimeout(r,850));assert.equal(puts,3);assert.equal(a.sync.state.status,'synced');
    const b=await device(DB);await b.sync.connect();assert.equal(b.local.pantry[0].name,'Potato');a.sync.disconnect();
  } finally {DB.close();}
});
