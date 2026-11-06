import {createServerClient,parseCookieHeader,serializeCookieHeader} from '@supabase/ssr';

export const privateJson=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'private, no-store','pragma':'no-cache','expires':'0','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
export function createSession(request,env=process.env) {
 const url=env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw Error('Account service is not configured.');
 const changed=new Map(),cacheHeaders={};
 const client=createServerClient(url,key,{
  cookieOptions:{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/'},
  cookies:{getAll:()=>parseCookieHeader(request.headers.get('cookie')||''),setAll(cookies,headers={}){for(const c of cookies)changed.set(c.name,c);Object.assign(cacheHeaders,headers);}},
  global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)})}
 });
 return {client,finish(response){
  const headers=new Headers(response.headers);
  for(const [name,value]of Object.entries(cacheHeaders))headers.set(name,value);
  headers.set('cache-control','private, no-store');headers.set('pragma','no-cache');headers.set('expires','0');
  for(const {name,value,options}of changed.values())headers.append('set-cookie',serializeCookieHeader(name,value,{...options,httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/'}));
  return new Response(response.body,{status:response.status,headers});
 }};
}
export async function verifiedUser(client) {
 const {data,error}=await client.auth.getUser();
 if(error&&(error.status===0||error.status>=500||error.name==='AuthRetryableFetchError'))throw Error('Account service unavailable.');
 const user=data?.user;
 return !error&&user?.id&&user.email_confirmed_at&&!user.is_anonymous?user:null;
}
