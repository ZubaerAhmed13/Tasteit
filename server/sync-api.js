import {parseBackup} from '../src/model.js';

const MAX_BYTES=2_000_000;
const json=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const validRevision=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
export async function boundedJson(request) {
  if(Number(request.headers.get('content-length'))>MAX_BYTES)throw Object.assign(new Error('Cloud copy exceeds 2 MB.'),{status:413});
  const reader=request.body?.getReader();if(!reader)throw new Error('Missing request body.');
  const chunks=[];let length=0;
  try {
    while(true) {
      const {value,done}=await reader.read();if(done)break;
      length+=value.byteLength;
      if(length>MAX_BYTES){await reader.cancel();throw Object.assign(new Error('Cloud copy exceeds 2 MB.'),{status:413});}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Sites dispatch supplies/validates this identity. The Worker is deployed only
// behind that boundary; clients never select an account through a request body.
export async function handleSync(request,env) {
  const url=new URL(request.url);
  if(url.pathname!=='/api/sync')return json({error:'Not found.'},404);
  const accountId=request.headers.get('oai-authenticated-user-id');
  if(!accountId || accountId.length>200 || /[\u0000-\u001f\u007f]/.test(accountId))return json({error:'Sign in with ChatGPT to sync.'},401);
  if(!['GET','PUT','DELETE'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(request.method!=='GET' && request.headers.get('origin')!==url.origin)return json({error:'Cross-origin changes are not allowed.'},403);
  if(!env.DB)return json({error:'Cloud sync is not available on this host.'},503);
  if(request.method==='GET') {
    try {
      const row=await env.DB.prepare('SELECT revision, payload, updated_at FROM tasteit_sync WHERE account_id = ?').bind(accountId).first();
      return json({accountId,revision:row?.revision||0,updatedAt:row?.updated_at||null,data:row?.payload?JSON.parse(row.payload):null});
    } catch {return json({error:'Could not read the cloud copy. Your browser data is unchanged.'},503);}
  }
  let body,payload=null;
  try {
    if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new Error('Send JSON data.');
    body=await boundedJson(request);
    if(body?.accountId!==accountId)return json({error:'The signed-in account changed. Reconnect before changing a cloud copy.'},409);
    if(!body || !validRevision(body.revision))throw new Error('Invalid cloud revision.');
    if(request.method==='PUT') {
      const data=parseBackup(JSON.stringify({format:'tasteit-backup',version:2,data:body.data}));
      payload=JSON.stringify(data);
    }
  } catch(error){return json({error:error.status===413?error.message:'Invalid cloud copy or revision.'},error.status||400);}
  try {
    const updatedAt=new Date().toISOString();
    const result=await env.DB.prepare(`INSERT INTO tasteit_sync (account_id, revision, payload, updated_at)
      SELECT ?1, 1, ?2, ?3 WHERE ?4 = 0 OR EXISTS
      (SELECT 1 FROM tasteit_sync WHERE account_id = ?1 AND revision = ?4)
      ON CONFLICT(account_id) DO UPDATE SET revision = tasteit_sync.revision + 1,
      payload = excluded.payload, updated_at = excluded.updated_at
      WHERE tasteit_sync.revision = ?4 RETURNING revision, updated_at`)
      .bind(accountId,payload,updatedAt,body.revision).all();
    const row=result.results?.[0];
    if(!row)return json({error:'The cloud copy changed. Review the latest version before replacing it.'},409);
    return json({accountId,revision:row.revision,updatedAt:row.updated_at});
  } catch {return json({error:'Cloud save failed. Your browser data is unchanged.'},503);}
}
