import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStore} from '../src/model.js';
import {sqliteD1} from './helpers/sqlite-d1.js';
const invoke=async(request,env)=>(await import('../server/sync-api.js')).handleSync(request,env);
const req=(method='GET',body,account='account-a',extra={})=>new Request('https://tasteit.test/api/sync',{
  method,headers:{...(account?{'oai-authenticated-user-id':account}:{}),...(method==='GET'?{}:{origin:'https://tasteit.test','content-type':'application/json'}),...extra},
  ...(body===undefined?{}:{body:JSON.stringify({accountId:account,...body})})});
test('sync API rejects anonymous and cross-origin writes before touching storage',async()=>{
  assert.equal((await invoke(req('GET',undefined,null),{})).status,401);
  assert.equal((await invoke(req('PUT',{revision:0,data:emptyStore()},'a',{origin:'https://attacker.test'}),{})).status,403);
});
test('account snapshots are isolated, no-store and use real atomic SQL revisions',async()=>{
  const DB=sqliteD1();try {
    const data={...emptyStore(),pantry:[{id:'rice',name:'Rice',quantity:'2',unit:'kg'}]};
    assert.equal((await invoke(req(),{DB})).headers.get('cache-control'),'no-store');
    const saved=await invoke(req('PUT',{revision:0,data}),{DB});assert.equal(saved.status,200);
    assert.equal((await saved.json()).revision,1);
    const mine=await (await invoke(req(),{DB})).json();assert.equal(mine.data.pantry[0].quantity,'2');
    const other=await (await invoke(req('GET',undefined,'account-b'),{DB})).json();
    assert.equal(other.revision,0);assert.equal(other.data,null);
    assert.equal((await invoke(req('PUT',{revision:0,data}),{DB})).status,409);
    const competing=await Promise.all([invoke(req('PUT',{revision:1,data}),{DB}),invoke(req('PUT',{revision:1,data}),{DB})]);
    assert.deepEqual(competing.map(x=>x.status).sort(),[200,409]);
  } finally {DB.close();}
});
test('cloud removal advances a tombstone and stale devices cannot resurrect it',async()=>{
  const DB=sqliteD1();try {
    await invoke(req('PUT',{revision:0,data:emptyStore()}),{DB});
    const removed=await invoke(req('DELETE',{revision:1}),{DB});assert.equal(removed.status,200);
    const remote=await (await invoke(req(),{DB})).json();assert.equal(remote.revision,2);assert.equal(remote.data,null);
    assert.equal((await invoke(req('PUT',{revision:1,data:emptyStore()}),{DB})).status,409);
    assert.equal((await invoke(req('PUT',{revision:2,data:emptyStore()}),{DB})).status,200);
  } finally {DB.close();}
});
test('malformed snapshots, invalid revisions and oversized bodies cannot be stored',async()=>{
  const DB=sqliteD1();try {
    for(const body of [{revision:-1,data:emptyStore()},{revision:0,data:{pantry:'bad'}},{revision:0,data:{...emptyStore(),tasteProfile:null}}])
      assert.equal((await invoke(req('PUT',body),{DB})).status,400);
    assert.equal((await invoke(req('PUT',{revision:0,data:emptyStore()},'a',{'content-length':'3000000'}),{DB})).status,413);
    assert.equal((await invoke(req('POST',{}),{DB})).status,405);
    assert.equal((await invoke(req(),{})).status,503);
  } finally {DB.close();}
});
test('cloud roundtrips breakfast and legacy dinner together without changing account isolation',async()=>{
 const DB=sqliteD1();try {
  const data={...emptyStore(),plan:{'2026-10-27':'rice','2026-10-27:breakfast':'eggs'},planServings:{'2026-10-27:breakfast':3}};
  const result=await invoke(req('PUT',{revision:0,data}),{DB});assert.equal(result.status,200);
  const restored=await(await invoke(req(),{DB})).json();assert.deepEqual(restored.data.plan,data.plan);assert.deepEqual(restored.data.planServings,data.planServings);
  assert.equal((await(await invoke(req('GET',undefined,'account-b'),{DB})).json()).data,null);
 }finally{DB.close();}
});
