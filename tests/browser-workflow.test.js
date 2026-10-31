import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

test('every browser acceptance suite failure fails CI before later suites can mask it',()=>{
 const workflow=readFileSync('.github/workflows/verify.yml','utf8');
 const block=workflow.split('      - name: Run headless browser acceptance')[1]?.split('        run: |\n')[1];
 assert.ok(block,'browser acceptance commands exist');
 const commands=block.split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
 const suites=['browser-smoke','discovery-browser','kitchen-browser','personalisation-browser','continuity-browser','vercel-browser','complete-recipes-browser','selected-sources-browser'];
 for(const browser of ['chromium','firefox','webkit'])for(const suite of suites){
  const script='node() { printf "%s\\n" "$1"; if [ "$1" = "$FAIL_SUITE" ]; then return 19; fi; }\n'+commands;
  const result=spawnSync('bash',['-e','-c',script],{encoding:'utf8',env:{...process.env,TASTEIT_BROWSER:browser,FAIL_SUITE:'tests/'+suite+'.mjs'}});
  assert.equal(result.status,19,browser+' must fail when '+suite+' fails');
  assert.equal(result.stdout.trim().split('\n').at(-1),'tests/'+suite+'.mjs','no later suite runs after a failure');
 }
});
