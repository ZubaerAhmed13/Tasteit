import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceImageTitles,commonsFileMetadata,wikiFilePage} from '../src/source-media.js';

const fake=(data,{status=200}={})=>async(url,options)=>({
  ok:status===200,status,
  async json(){return typeof data==='function'?data(new URL(url),options):data;}
});
test('Wikibooks file research checks a concrete page id and keeps original file titles only',async()=>{
  const urls=[];
  const fetcher=async url=>{
    urls.push(new URL(url));
    return {ok:true,async json(){return {query:{pages:[{pageid:101,images:[
      {title:'File:Traditional Stew.jpg'},
      {title:'File:Traditional Stew.jpg'},
      {title:'File:Ingredient diagram.svg'},{title:'Template:Ignore'}
    ]}]}};}};
  };
  const titles=await sourceImageTitles(101,{fetcher});
  assert.deepEqual(titles,['File:Traditional Stew.jpg','File:Ingredient diagram.svg']);
  assert.equal(urls[0].hostname,'en.wikibooks.org');
  assert.equal(urls[0].searchParams.get('pageids'),'101');
  assert.equal(urls[0].searchParams.get('origin'),'*');
  await assert.rejects(sourceImageTitles('bad',{fetcher}),/Invalid Wikibooks/);
  assert.throws(()=>wikiFilePage('https://attacker.test'),/Unrecognised/);
  assert.ok(wikiFilePage('File:Traditional Stew.jpg').startsWith('https://commons.wikimedia.org/wiki/'));
});
test('Commons metadata is evidence only and never an image reuse permission',async()=>{
  const fetcher=fake({query:{pages:[{title:'File:Traditional Stew.jpg',imageinfo:[{
    extmetadata:{
      Artist:{value:'<a href="https://example.org">Chef</a>'},
      Credit:{value:'Contributor source'},
      LicenseShortName:{value:'CC BY-SA 4.0'},
      LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'},
      AttributionRequired:{value:'true'}
    }
  }]}]}});
  const info=await commonsFileMetadata('File:Traditional Stew.jpg',{fetcher});
  assert.equal(info.foundOnCommons,true);
  assert.equal(info.license,'CC BY-SA 4.0');
  assert.equal(info.licenseUrl,'https://creativecommons.org/licenses/by-sa/4.0/');
  assert.equal(info.artist,'<a href="https://example.org">Chef</a>');
  assert.equal(info.attributionRequired,'true');
  assert.equal(Object.hasOwn(info,'approved'),false);
  assert.equal(Object.hasOwn(info,'imageData'),false);
});
test('no Commons file and invalid licence URLs fail safely',async()=>{
  const missing=await commonsFileMetadata('File:Unknown.png',{fetcher:fake({query:{pages:[{missing:true}]}})});
  assert.equal(missing.foundOnCommons,false);
  assert.equal(missing.licenseUrl,'');
  const unsafe=await commonsFileMetadata('File:Unknown.png',{fetcher:fake({query:{pages:[{
    imageinfo:[{extmetadata:{LicenseUrl:{value:'javascript:alert(1)'}}}]
  }]}})});
  assert.equal(unsafe.licenseUrl,'');
  await assert.rejects(sourceImageTitles(10,{fetcher:fake({}, {status:429})}),/unavailable/);
  await assert.rejects(commonsFileMetadata('File:Example.png',{fetcher:fake({error:{code:'badrequest'}})}),/returned an error/);
});
