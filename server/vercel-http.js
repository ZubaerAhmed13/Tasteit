import {Readable} from 'node:stream';
export function nodeHandler(handle) {
 return async(req,res)=>{
  try {
   const secure=process.env.VERCEL==='1'||req.socket?.encrypted;
   const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
   const method=req.method||'GET',url=(secure?'https://':'http://')+req.headers.host+req.url;
   let body;
   if(!['GET','HEAD'].includes(method))body=req.body===undefined?Readable.toWeb(req):typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);
   const response=await handle(new Request(url,{method,headers,...(body===undefined?{}:{body,duplex:'half'})}));
   res.statusCode=response.status;
   for(const [key,value]of response.headers)if(key!=='set-cookie')res.setHeader(key,value);
   const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.statusCode=503;res.setHeader('cache-control','private, no-store');res.setHeader('content-type','application/json');res.end(JSON.stringify({error:'Service unavailable. Your browser data is unchanged.'}));}
 };
}
