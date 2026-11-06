const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createHostAuth({fetch:request=globalThis.fetch,onState=()=>{},timeoutMs=12000}={}) {
 let state={supported:false,user:null,loading:false,message:'',email:'',succeeded:false},sequence=0;
 const emit=next=>{state={...state,...next};onState(state);return state;};
 async function perform(action,fields={}) {
  const ticket=++sequence,controller=new AbortController();let timeout;
  if(action)emit({supported:true,loading:true,message:'',succeeded:false,email:String(fields.email||state.email)});
  let supported=state.supported;
  try {
   const work=(async()=>{
    const res=await request('/api/auth',{method:action?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{accept:'application/json',...(action?{'content-type':'application/json'}:{})},...(action?{body:JSON.stringify({action,...(action==='sign-out'?{}:{email:String(fields.email||''),password:String(fields.password||'')})})}:{})});
    if(res.status===404&&!action)return {supported:false,user:null};
    const data=await res.json();
    if(data?.supported===true)supported=true;
    if(!res.ok)throw Error(typeof data?.error==='string'?data.error:'Account service is unavailable.');
    if(data?.supported!==true)throw Error('Account service returned an invalid response.');
    const user=data.user===null?null:data.user&&typeof data.user.id==='string'&&data.user.id.length<=128&&typeof data.user.email==='string'&&data.user.email.length<=254?{id:data.user.id,email:data.user.email}:null;
    return {supported:true,user,message:String(data.message||'').slice(0,500)};
   })();
   const result=await Promise.race([work,new Promise((_resolve,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(Error('Account request timed out. Your local kitchen is unchanged.'));},timeoutMs);})]);
   if(ticket!==sequence)return state;
   return emit({...result,loading:false,succeeded:true});
  }catch(error){if(ticket!==sequence)return state;return emit({supported:action?true:supported,loading:false,succeeded:false,message:error.message||'Account service is unavailable.'});}
  finally{clearTimeout(timeout);}
 }
 return {get state(){return state;},refresh:()=>perform(),submit:(action,fields)=>perform(action,fields)};
}
export function accountMarkup(state) {
 if(!state?.supported)return '';
 const message='<p class="panel-note account-status" role="status" tabindex="-1">'+esc(state.message||'Sign in to your private cloud kitchen. Signing in does not enable sync automatically.')+'</p>';
 if(state.user)return '<section class="sync-account"><h4>Your sync account</h4><p class="panel-note">Signed in as <strong>'+esc(state.user.email)+'</strong></p>'+message+'<button type="button" class="btn secondary small" data-action="account-sign-out"'+(state.loading?' disabled':'')+'>Sign out on this device</button></section>';
 return '<section class="sync-account"><h4>Sign in for cloud sync</h4>'+message+'<form id="sync-account-form" class="sync-account-form"><div class="field"><label for="sync-account-email">Email</label><input id="sync-account-email" type="email" name="email" autocomplete="username" maxlength="254" value="'+esc(state.email)+'" required></div><div class="field"><label for="sync-account-password">Password · 12–128 characters</label><input id="sync-account-password" type="password" name="password" autocomplete="current-password" minlength="12" maxlength="128" required></div><div class="dialog-actions"><button class="btn secondary small" type="submit" value="sign-in"'+(state.loading?' disabled':'')+'>Sign in</button><button class="btn ghost small" type="submit" value="sign-up"'+(state.loading?' disabled':'')+'>Create sync account</button></div></form><p class="panel-note">Confirm your email when creating an account. Your existing kitchen stays local until you enable sync. To move from the previous address, export a backup there and import it here.</p></section>';
}
