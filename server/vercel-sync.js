import {parseBackup,exportBackup} from '../src/model.js';
import {boundedJson} from './sync-api.js';
import {createSession,verifiedUser,privateJson as json} from './supabase-client.js';
export async function handleVercelSync(request,{session=createSession}={}) {
 const url=new URL(request.url);
 if(!['GET','PUT','DELETE'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json({error:'Cross-origin changes are not allowed.'},403);
 let current;
 const finish=response=>current?current.finish(response):response;
 try {
  current=session(request);const client=current.client,user=await verifiedUser(client);
  if(!user)return finish(json({error:'Sign in to your Tasteit sync account.'},401));
  if(request.method==='GET') {
   const {data:row,error}=await client.from('tasteit_sync').select('revision,payload,updated_at').eq('account_id',user.id).maybeSingle();
   if(error)throw Error('Could not read cloud copy.');
   const revision=Number(row?.revision||0);
   if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid cloud revision.');
   const data=row?.payload===null||!row?null:parseBackup(exportBackup(row.payload));
   return finish(json({accountId:user.id,revision,updatedAt:row?.updated_at||null,data}));
  }
  let body,data=null;
  try {
   if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error('Send JSON.');
   body=await boundedJson(request);
   if(body?.accountId!==user.id)return finish(json({error:'The signed-in account changed. Reconnect before changing a cloud copy.'},409));
   if(!Number.isSafeInteger(body.revision)||body.revision<0||body.revision>=Number.MAX_SAFE_INTEGER)throw Error('Invalid revision.');
   if(request.method==='PUT')data=parseBackup(exportBackup(body.data));
  }catch(error){return finish(json({error:error.status===413?'Cloud copy exceeds 2 MB.':'Invalid cloud copy or revision.'},error.status||400));}
  const {data:rows,error}=await client.rpc('tasteit_write_snapshot',{expected_revision:body.revision,snapshot:data});
  if(error)throw Error('Cloud save unavailable.');
  const row=rows?.[0];if(!row)return finish(json({error:'The cloud copy changed. Review the latest version before replacing it.'},409));
  return finish(json({accountId:user.id,revision:Number(row.revision),updatedAt:row.updated_at}));
 }catch{return finish(json({error:'Cloud sync is unavailable. Your browser data is unchanged.'},503));}
}
