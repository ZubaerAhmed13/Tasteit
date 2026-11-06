import {boundedJson} from './sync-api.js';
import {createSession,verifiedUser,privateJson as json} from './supabase-client.js';
const publicUser=user=>user?{id:user.id,email:user.email}:null;
export async function handleVercelAuth(request,{session=createSession}={}) {
 const url=new URL(request.url);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return json({error:'Cross-origin account changes are not allowed.'},403);
 let body,current;const finish=response=>current?current.finish(response):response;
 if(request.method==='POST') {
  try {
   if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw Error();
   if(Number(request.headers.get('content-length'))>20000)throw Error();
   body=await boundedJson(request);
   if(JSON.stringify(body).length>20000||!['sign-in','sign-up','sign-out'].includes(body.action))throw Error();
   if(body.action!=='sign-out'&&(typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)||body.email.length>254||typeof body.password!=='string'||body.password.length<12||body.password.length>128))throw Error();
  }catch{return json({error:'Check your email and password (12–128 characters).'},400);}
 }
 try {
  current=session(request);const client=current.client;
  if(request.method==='GET') {
   const code=url.searchParams.get('code');
   if(code){
    if(code.length>4096)return finish(json({error:'Invalid confirmation.'},400));
    const {error}=await client.auth.exchangeCodeForSession(code);
    return finish(new Response(null,{status:303,headers:{location:url.origin+'/?view=library&account='+(error?'confirmation-error':'confirmed'),'referrer-policy':'no-referrer'}}));
   }
   return finish(json({supported:true,user:publicUser(await verifiedUser(client))}));
  }
  if(body.action==='sign-out') {
   const {error}=await client.auth.signOut({scope:'local'});if(error)throw Error();
   return finish(json({supported:true,user:null,message:'Signed out. This browser’s kitchen stays on this device.'}));
  }
  const {data,error}=body.action==='sign-up'
   ?await client.auth.signUp({email:body.email.trim(),password:body.password,options:{emailRedirectTo:url.origin+'/api/auth'}})
   :await client.auth.signInWithPassword({email:body.email.trim(),password:body.password});
  if(error)return finish(json({error:'Could not sign in or create this account. Check your details, email confirmation, or try again later.'},400));
  if(body.action==='sign-up'&&!data?.session)return finish(json({supported:true,user:null,message:'Check your email to confirm your account, then return here to sign in.'}));
  return finish(json({supported:true,user:publicUser(await verifiedUser(client))}));
 }catch{return finish(json({supported:true,error:'Account service is unavailable. Your local kitchen is unchanged.'},503));}
}
