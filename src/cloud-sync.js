import {emptyStore,exportBackup,parseBackup} from './model.js';

export const SYNC_KEY='tasteit.sync.v1';
export function syncData(store) {
  return {...emptyStore(),...parseBackup(exportBackup(store,new Date(0)))};
}
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
export const syncFingerprint=store=>JSON.stringify(ordered(syncData(store)));
export function copySummary(data) {
  return {recipes:Object.keys(data?.saved||{}).length,batches:data?.pantry?.length||0,
    planned:Object.keys(data?.plan||{}).length,leftovers:data?.leftovers?.length||0};
}

export function createCloudSync({readLocal,writeLocal,readMeta,writeMeta,fetch:request=globalThis.fetch,
  onState=()=>{},isOnline=()=>globalThis.navigator?.onLine!==false}) {
  let meta;
  try {meta=readMeta();}catch{}
  if(!meta || meta.enabled!==true || !Number.isSafeInteger(meta.revision||0) || typeof(meta.base||'')!=='string')meta={enabled:false};
  let state={status:meta.enabled?'pending':'off',enabled:meta.enabled===true},busy=null,timer=null,conflict=null,generation=0,activeController=null;
  const emit=(status,extra={})=>{state={status,enabled:meta.enabled===true,...extra};onState(state);return state;};
  function saveMeta(next) {
    if(writeMeta(next)!==true)throw new Error('Could not save sync status in this browser. Your data is still local.');
    meta=next;
  }
  async function api(method='GET',body) {
    const controller=new AbortController(),epoch=generation;activeController=controller;let timeout;
    try {
      const work=(async()=>{
        const response=await request('/api/sync',{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,
          headers:{accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
        if(epoch!==generation)throw Object.assign(new Error('Sync stopped.'),{cancelled:true});
        if(!response.ok)throw Object.assign(new Error(response.status===401?'Sign in again to sync. Local data is unchanged.':response.status===409?'The cloud copy changed. Press Sync now to review it.':'Cloud sync is unavailable. Your edits stay in this browser.'),{status:response.status});
        const result=await response.json();
        if(epoch!==generation)throw Object.assign(new Error('Sync stopped.'),{cancelled:true});
        if(!result || typeof result.accountId!=='string' || !result.accountId || !Number.isSafeInteger(result.revision) || result.revision<0)throw new Error('The cloud returned an invalid response.');
        if(method==='GET') {
          if(!('data' in result))throw new Error('The cloud returned an incomplete copy.');
          if(result.data!==null)result.data=syncData(result.data);
        }
        return result;
      })();
      return await Promise.race([work,new Promise((_resolve,reject)=>{timeout=setTimeout(()=>{
        controller.abort();reject(new Error('Cloud sync timed out. Your edits stay in this browser.'));
      },12_000);})]);
    } finally {clearTimeout(timeout);if(activeController===controller)activeController=null;}
  }
  function reportError(error) {
    conflict=null;
    return emit(error?.status===401?'signed-out':'error',{message:error.message||'Sync failed. Your local data is unchanged.'});
  }
  function agreed(remote,base) {
    saveMeta({enabled:true,accountId:remote.accountId,revision:remote.revision,base,updatedAt:remote.updatedAt||null});
    conflict=null;
    return emit(syncFingerprint(readLocal())===base?'synced':'pending',{updatedAt:remote.updatedAt});
  }
  function review(remote,local) {
    conflict={remote,local};
    return emit('conflict',{local:copySummary(JSON.parse(local)),remote:remote.data?copySummary(remote.data):null,
      updatedAt:remote.updatedAt,cloudRemoved:remote.data===null,
      message:remote.data===null?'The cloud copy was removed. Your browser copy is safe.':'Both copies contain changes. Choose which copy to keep.'});
  }
  async function upload(remote,local) {
    const result=await api('PUT',{accountId:remote.accountId,revision:remote.revision,data:JSON.parse(local)});
    if(result.accountId!==remote.accountId)throw new Error('The signed-in account changed. Reconnect to review your copies.');
    return agreed(result,local);
  }
  function download(remote,expectedLocal) {
    if(syncFingerprint(readLocal())!==expectedLocal)throw new Error('This browser changed during sync. Press Sync now to review again.');
    if(writeLocal(remote.data)!==true)throw new Error('Could not save the cloud copy in this browser. Local data is unchanged.');
    return agreed(remote,syncFingerprint(remote.data));
  }
  async function reconcile() {
    if(!meta.enabled)return emit('off');
    if(!isOnline())return emit('offline',{message:'Offline. Changes stay here and can sync when you reconnect.'});
    emit('checking');
    const remote=await api();
    if(meta.accountId && meta.accountId!==remote.accountId)return emit('account-changed',{message:'The signed-in account changed. Turn sync off, then enable it again to review this account.'});
    if(meta.accountId===remote.accountId && remote.revision<meta.revision)throw new Error('The cloud response was older than the last synced copy. Press Sync now to try again.');
    const local=syncFingerprint(readLocal());
    const remotePrint=remote.data===null?null:syncFingerprint(remote.data);
    if(remotePrint===local)return agreed(remote,local);
    if(!meta.base) {
      if(remotePrint===null) {
        if(local===syncFingerprint(emptyStore()))return agreed(remote,local);
        if(remote.revision>0)return review(remote,local);
        return upload(remote,local);
      }
      if(local===syncFingerprint(emptyStore()))return download(remote,local);
      return review(remote,local);
    }
    const localChanged=local!==meta.base,remoteChanged=remote.revision!==meta.revision;
    if(remote.data===null && remoteChanged)return review(remote,local);
    if(localChanged && remoteChanged)return review(remote,local);
    if(remoteChanged)return download(remote,local);
    if(localChanged)return upload(remote,local);
    return agreed(remote,local);
  }
  async function serial(work) {
    if(busy)return busy;
    const epoch=generation;
    busy=(async()=>{try{return await work();}catch(error){return error.cancelled || epoch!==generation?state:reportError(error);}finally{busy=null;}})();
    return busy;
  }
  const engine={
    get state(){return state;},
    async connect(){
      try {saveMeta({...meta,enabled:true,revision:meta.revision||0});}catch(error){return reportError(error);}
      return engine.sync();
    },
    sync:()=>serial(reconcile),
    async refresh(){
      try {
        const next=readMeta();
        if(!next || next.enabled!==true)return engine.disconnect();
        meta=next;
        return engine.sync();
      } catch(error){return reportError(error);}
    },
    changed(){
      if(!meta.enabled)return;
      clearTimeout(timer);timer=setTimeout(()=>{timer=null;void engine.sync();},700);
      emit(isOnline()?'pending':'offline');
    },
    resolve(choice){return serial(async()=>{
      if(!conflict || !['local','remote'].includes(choice))throw new Error('Press Sync now to review the current copies.');
      const reviewed=conflict;
      if(syncFingerprint(readLocal())!==reviewed.local)throw new Error('Your browser copy changed. Press Sync now to review again.');
      if(choice==='local')return upload(reviewed.remote,reviewed.local);
      if(!reviewed.remote.data)throw new Error('The cloud copy was removed. Keep this browser copy or turn sync off.');
      const latest=await api();
      if(latest.accountId!==reviewed.remote.accountId || latest.revision!==reviewed.remote.revision)throw new Error('The cloud copy changed. Press Sync now to review again.');
      return download(latest,reviewed.local);
    });},
    disconnect(){
      generation++;activeController?.abort();
      clearTimeout(timer);timer=null;conflict=null;
      try {saveMeta({enabled:false});return emit('off');}catch(error){meta={enabled:false};return reportError(error);}
    },
    removeCloud(){return serial(async()=>{
      const latest=await api();
      if(meta.accountId && latest.accountId!==meta.accountId)throw new Error('The account changed. Reconnect before removing a cloud copy.');
      await api('DELETE',{accountId:latest.accountId,revision:latest.revision});
      return engine.disconnect();
    });}
  };
  return engine;
}
