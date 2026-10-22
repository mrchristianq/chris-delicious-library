import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(s,c,n){
 if(c.parentURL?.endsWith('/provider-access.ts') && ['./config','./server'].includes(s))return {url:`data:text/javascript,${encodeURIComponent(s==='./config'?'export function getV14Config(){return {origin:"http://localhost:3014"}}':'export async function createV14Client(){return {auth:{getUser:async()=>({data:{user:null}})}}}')}`,shortCircuit:true};
 return n(s,c);
}});
const {validateProviderImageUrl,proxyProviderImage,proxySidebarIcon,readLimitedBody,requireV14ProviderUser}=await import('../../app/lib/v14/provider-access.ts');
hooks.deregister();
test('requires authentication before provider access',async()=>{await assert.rejects(requireV14ProviderUser(),e=>e.status===401);});
test('image URLs reject private hosts, userinfo, lookalikes and non-HTTPS',()=>{
 for(const url of ['http://image.tmdb.org/a.jpg','https://127.0.0.1/a.jpg','https://image.tmdb.org.evil.test/a.jpg','https://user@image.tmdb.org/a.jpg','https://image.tmdb.org:444/a.jpg'])assert.equal(validateProviderImageUrl(url),null);
 assert.ok(validateProviderImageUrl('https://image.tmdb.org/t/p/w500/a.jpg'));
 assert.equal(validateProviderImageUrl('https://assets.test/wrong/a.jpg','https://assets.test/v14'),null);
 assert.ok(validateProviderImageUrl('https://assets.test/v14/a.jpg','https://assets.test/v14'));
});
test('provider image stream returns bytes without Node streaming Request failure',async()=>{
 const image=new Uint8Array([1,2,3]);
 const result=await proxyProviderImage('https://image.tmdb.org/a.jpg',async(url,options)=>{
  assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  return new Response(image,{headers:{'content-type':'image/jpeg'}});
 });
 assert.equal(result.status,200);assert.deepEqual(new Uint8Array(await result.arrayBuffer()),image);
});
test('oversized and HTML responses do not become cover images',async()=>{
 for(const response of [new Response('<html/>',{headers:{'content-type':'text/html'}}),new Response('x',{headers:{'content-type':'image/jpeg','content-length':String(11*1024*1024)}})]){
  assert.equal((await proxyProviderImage('https://image.tmdb.org/a.jpg',async()=>response)).status,502);
 }
});
test('actual byte limit applies even without content-length',async()=>{
 await assert.rejects(readLimitedBody(new Request('https://example.test',{method:'POST',body:'1234'}),3),e=>e.status===413);
});
test('sidebar fallback cannot recursively invoke API routes',async()=>{
 for(const fallback of ['/api/sidebar-icon','/v14/api/provider/sidebar-icon','//evil.test/a.png','/v14/api/provider/cover-proxy/a.png']){
  const result=await proxySidebarIcon('http://localhost:3014/v14/api/provider/sidebar-icon',{iconKey:'',version:'',fallback},undefined,async()=>assert.fail('must not fetch unsafe fallback'));
  assert.equal(result.status,404);
 }
});
