import {mkdir,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applicationAssets} from './build-site.mjs';
export async function buildVercel({out='dist/vercel',commit=process.env.VERCEL_GIT_COMMIT_SHA||process.env.TASTEIT_SOURCE_COMMIT,root=process.cwd()}={}) {
 if(!commit)commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40}$/.test(commit))throw Error('An exact source commit is required.');
 const assets=await applicationAssets(root),assetDigest=createHash('sha256').update(JSON.stringify(assets)).digest('hex');
 await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
 for(const [name,asset]of Object.entries(assets)){const file=path.join(out,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,asset.body);}
 await writeFile(path.join(out,'tasteit-source.json'),JSON.stringify({repository:'ZubaerAhmed13/Tasteit',commit,assetDigest,purpose:'private-vercel-hosting'})+'\n');
 console.log('Built '+Object.keys(assets).length+' unchanged application assets from '+commit+' ('+assetDigest+').');
 return {commit,assetDigest};
}
if(process.argv[1]===new URL(import.meta.url).pathname)await buildVercel();
