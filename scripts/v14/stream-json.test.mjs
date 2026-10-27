import test from 'node:test';import assert from 'node:assert/strict';import {streamLibraryJson} from '../../app/lib/v14/stream-json.ts';
test('large JSON streams in bounded chunks, retains Unicode and remains uncached',async()=>{
 const value={title:'Pokémon 🧙',metadata:'🧙'.repeat(1300000)};
 const response=streamLibraryJson(value,{'Cache-Control':'no-store'});
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.has('content-length'),false);
 const reader=response.body.getReader(),parts=[];let chunks=0;
 while(true){const {done,value}=await reader.read();if(done)break;assert.ok(value.byteLength<=65536);parts.push(value);chunks++;}
 assert.ok(chunks>1);assert.deepEqual(JSON.parse(Buffer.concat(parts).toString('utf8')),value);
});
