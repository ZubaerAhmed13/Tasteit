import test from 'node:test';
import assert from 'node:assert/strict';
import {recipeSteps,safeCookingSession,moveCookingStep,setCookingTimer,startCookingTimer,
  pauseCookingTimer,resetCookingTimer,timerStatus,formatCookingTime,validCookingSessions} from '../src/cooking.js';
import {exportBackup,parseBackup,emptyStore,loadStore} from '../src/model.js';

test('guided cooking keeps clear steps and strips simple numbered labels',()=>{
  assert.deepEqual(recipeSteps({strInstructions:'1. Wash rice.\n2. Cook rice for 5 minutes.\n3) Serve.'}),
    ['Wash rice.','Cook rice for 5 minutes.','Serve.']);
  assert.deepEqual(recipeSteps({strInstructions:''}),[]);
  assert.deepEqual(recipeSteps(null),[]);
});
test('stores and restores each step while clamping invalid progress',()=>{
  assert.equal(safeCookingSession({step:8},3).step,2);
  assert.equal(safeCookingSession({step:-20},3).step,0);
  const initial=safeCookingSession(null,3);
  assert.equal(initial.step,0);
  const moved=moveCookingStep(initial,2,3);
  assert.equal(moved.step,2);
  assert.equal(moveCookingStep(moved,30,3).step,2);
  assert.equal(moveCookingStep(moved,-1,3).step,0);
});
test('manual timer stays accurate across tab sleep and does not require a continuously ticking interval',()=>{
  const start=Date.parse('2026-10-23T10:00:00Z');
  const session=setCookingTimer({},5,3);
  assert.deepEqual([session.durationSeconds,session.remainingSeconds],[300,300]);
  const running=startCookingTimer(session,3,start);
  assert.equal(timerStatus(running,start).text,'05:00');
  assert.equal(timerStatus(running,start+61000).text,'03:59');
  assert.equal(timerStatus(running,start+300000).complete,true);
  assert.equal(timerStatus(running,start+400000).text,'00:00');
  const paused=pauseCookingTimer(running,3,start+90000);
  assert.equal(paused.remainingSeconds,210);
  assert.equal(paused.endsAt,null);
  assert.equal(timerStatus(paused,start+500000).text,'03:30');
  const restarted=startCookingTimer(paused,3,start+500000);
  assert.equal(timerStatus(restarted,start+500000).text,'03:30');
  assert.equal(resetCookingTimer(restarted,3).remainingSeconds,300);
  assert.equal(formatCookingTime(3661),'61:01');
});
test('invalid or ambiguous timer quantities are rejected',()=>{
  for(const value of ['0','181','2.5','tomorrow',null,Infinity,-1]){
    assert.throws(()=>setCookingTimer({},value,3),/between 1 and 180/);
  }
  const complete=startCookingTimer(setCookingTimer({},1,2),2,1000);
  assert.throws(()=>startCookingTimer(complete,2,90000),/Reset the timer/);
});
test('backups preserve cooking progress, reject malformed sessions and support old backups',()=>{
  const session=startCookingTimer(moveCookingStep(setCookingTimer({},10,3),2,3),3,Date.parse('2026-10-23T10:00:00Z'));
  const store={...emptyStore(),cookingSessions:{rice:session}};
  assert.equal(parseBackup(exportBackup(store)).cookingSessions.rice.step,2);
  assert.equal(validCookingSessions({rice:session}),true);
  assert.equal(validCookingSessions({rice:{...session,step:-2}}),false);
  assert.equal(validCookingSessions({rice:{...session,endsAt:'tomorrow'}}),false);
  const old={pantry:[],saved:{},plan:{}};
  assert.deepEqual(parseBackup(exportBackup(old)),old);
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(old)}).cookingSessions,{});
  const corrupt={...store,cookingSessions:{rice:{...session,remainingSeconds:-1}}};
  assert.throws(()=>parseBackup(exportBackup(corrupt)),/invalid cooking sessions/);
});
