import {readFile,readdir,mkdir,writeFile,mkdtemp,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
export async function applicationAssets(directory=root) {
  const names=['index.html','selected-recipes.html','styles.css','favicon.svg','robots.txt','app.webmanifest','sw.js'];
  for(const dir of ['src','data'])for(const name of await readdir(path.join(directory,dir)))
    if(/\.(js|json|csv)$/.test(name))names.push(dir+'/'+name);
  const assets={};for(const name of names.sort())assets['/'+name]={body:await readFile(path.join(directory,name),'utf8'),type:types[path.extname(name)]||'text/plain; charset=utf-8'};
  const digest=createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0,20);
  assets['/sw.js'].body=assets['/sw.js'].body.replaceAll('__TASTEIT_BUILD__',digest);
  return assets;
}
if(process.argv[1]===new URL(import.meta.url).pathname) {
  const temp=await mkdtemp(path.join(tmpdir(),'tasteit-worker-'));
  try {
    const assets=await applicationAssets(root);
    const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
    assets['/tasteit-source.json']={type:'application/json',body:JSON.stringify({repository:'ZubaerAhmed13/Tasteit',commit,purpose:'private-testing-preview'})};
    const entry=path.join(temp,'entry.mjs');
    await writeFile(entry,'import {createWorker} from '+JSON.stringify(path.join(root,'server/worker.js'))+';\nexport default createWorker('+JSON.stringify(assets)+');\n');
    await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
    await build({entryPoints:[entry],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
    let manifest={d1:'DB',r2:null};
    try {manifest={...JSON.parse(await readFile('.openai/hosting.json','utf8')),d1:'DB',r2:null};delete manifest.static;}catch{}
    await writeFile('dist/.openai/hosting.json',JSON.stringify(manifest,null,2)+'\n');
    console.log('Built dependency-free Worker and '+Object.keys(assets).length+' app assets from '+commit);
  } finally {await rm(temp,{recursive:true,force:true});}
}
