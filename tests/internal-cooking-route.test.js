import test from 'node:test';
import assert from 'node:assert/strict';
import {readRoute,routeUrl} from '../src/navigation.js';
test('self-contained cooking collection survives navigation and bookmark reloads',()=>{
 const url=routeUrl({scope:'cooking',query:'rice',course:'main'},'https://tasteit.test/');
 assert.equal(readRoute(url).scope,'cooking');
 assert.equal(readRoute(url).query,'rice');
});
