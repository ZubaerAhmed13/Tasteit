import test from 'node:test';import assert from 'node:assert/strict';
import {collectionJson} from '../src/collection-request.js';
test('collection request deadline covers ignored aborts and stalled JSON bodies',async()=>{
 let signal;
 await assert.rejects(collectionJson('/data.json',{timeoutMs:10,request:(_url,init)=>{signal=init.signal;return new Promise(()=>{});}}),/timed out/i);assert.equal(signal.aborted,true);
 await assert.rejects(collectionJson('/data.json',{timeoutMs:10,request:async()=>({ok:true,json:()=>new Promise(()=>{})})}),/timed out/i);
});
test('collection request returns actual JSON and rejects failed responses',async()=>{
 assert.deepEqual(await collectionJson('/data.json',{request:async()=>({ok:true,json:async()=>({recipes:[1]})})}),{recipes:[1]});
 await assert.rejects(collectionJson('/data.json',{request:async()=>({ok:false,status:503})}),/503/);
});
