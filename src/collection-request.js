export async function collectionJson(url,{request=globalThis.fetch,timeoutMs=12000}={}) {
 const controller=new AbortController();let timer;
 try {
  const deadline=new Promise((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('The collection request timed out.'));},timeoutMs);});
  const work=(async()=>{const response=await request(url,{signal:controller.signal});if(!response.ok)throw new Error('Collection returned HTTP '+response.status);return response.json();})();
  return await Promise.race([work,deadline]);
 } finally {clearTimeout(timer);}
}
