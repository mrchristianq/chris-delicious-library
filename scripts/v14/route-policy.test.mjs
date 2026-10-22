import test from 'node:test';
import assert from 'node:assert/strict';
import {v14ProviderTarget,isV14PublicAsset,blocksValidationWrite} from '../../app/lib/v14/route-policy.ts';
test('only explicit read-provider endpoints enter guarded wrappers',()=>{
 assert.equal(v14ProviderTarget('/api/media-search','GET'),'/v14/api/provider/media-search');
 assert.equal(v14ProviderTarget('/api/recommendations','POST'),'/v14/api/provider/recommendations');
 for(const p of ['/api/sheets-write','/api/upload-cover','/api/roadmap','/api/ui-prefs','/api/sync-covers','/api/media-search/other','/api/media-search.png'])for(const m of ['GET','POST','PUT','DELETE'])assert.equal(v14ProviderTarget(p,m),null);
 assert.equal(v14ProviderTarget('/api/tv-episodes','POST'),null);
});
test('assets retain original appearance without admitting service workers or APIs',()=>{
 for(const p of ['/shelf2.png','/icon-books.svg','/fonts/library.woff2'])assert.equal(isV14PublicAsset(p,'GET'),true);
 for(const p of ['/sw.js','/api/foo.png','/v14/api/foo.png','/','/../secrets.png','/.env.local'])assert.equal(isV14PublicAsset(p,'GET'),false);
 assert.equal(isV14PublicAsset('/shelf2.png','POST'),false);
});
test('manual sync exception never admits ordinary library mutations or strict read-only writes',()=>{
 assert.equal(blocksValidationWrite('/v14/api/sync-manual','POST',true,true),false);
 assert.equal(blocksValidationWrite('/v14/api/sync-manual','POST',true,false),true);
 for(const path of ['/v14/api/library','/v14/api/items','/api/sheets-write','/v14/api/sync-manual/other'])assert.equal(blocksValidationWrite(path,'POST',true,true),true);
 for(const method of ['PUT','DELETE','PATCH'])assert.equal(blocksValidationWrite('/v14/api/sync-manual',method,true,true),true);
});
