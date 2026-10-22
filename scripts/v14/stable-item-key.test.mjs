import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { originalParsers } from './v13-parsers.mjs';
const hooks = registerHooks({resolve(s,c,n){return n(s.startsWith('./') && c.parentURL?.includes('/app/lib/v14/') && !s.endsWith('.ts') ? `${s}.ts` : s,c);}});
const { stableItemKey, legacyKeyResolver, reconcileOrderValue } = await import('../../app/lib/v14/stable-item-key.ts');
const { rendererSnapshot, retainDatabaseIdentity } = await import('../../app/lib/v14/renderer-snapshot.ts');
hooks.deregister();
const library = '22222222-2222-4222-8222-222222222222';
const owner = '11111111-1111-4111-8111-111111111111';
const id = '33333333-3333-4333-8333-333333333333';
function item(type='game', suffix='3', metadata={Title:'Original title',Platform:'Steam'}) {
  return {id:id.slice(0,-1)+suffix,library_id:library,media_type:type,title:'Original title',revision:1,user_status:'Wishlist',personal_rating:null,completed_on:null,notes:'',user_fields:{},metadata};
}
function snapshot(items, settings=[]) { return {schema_version:1,library_id:library,owner_id:owner,observed_at:'2026-10-14T12:00:00Z',change_token:'test',complete:true,counts:{items:items.length,episodes:0,settings:settings.length},items,episodes:[],settings}; }
const setting = (key,value) => ({key,revision:1,value:{value}});
test('stable keys survive rename, platform/format/provider edits and revisions; v13 unchanged', () => {
  const key = stableItemKey({__cdlItemId:id,__cdlLibraryId:library,__cdlMediaType:'game'});
  assert.equal(key, `game:db:${library}:${id}`);
  assert.equal(stableItemKey({title:'Original title',platform:'Steam'}),null);
  const parsed = retainDatabaseIdentity({title:'Renamed',platform:'PlayStation 5'},rendererSnapshot(snapshot([item()])).games[0]);
  assert.equal(stableItemKey(parsed),key);
  assert.notEqual(stableItemKey({...parsed,__cdlIdentity:{...parsed.__cdlIdentity,libraryId:owner}}),key);
});
test('imported order retains position after rename and reopen without mutating stored settings', () => {
  const row=item(); row.title='Renamed'; row.user_fields={Platform:'Xbox'}; row.revision=2;
  const raw='["game:original-title:steam","unknown-entry"]';
  const source=snapshot([row],[setting('viewManualOrder:play-next',raw)]);
  const result=rendererSnapshot(source);
  assert.deepEqual(JSON.parse(result.settings[0].Value),[`game:db:${library}:${id}`,'unknown-entry']);
  assert.equal(source.settings[0].value.value,raw);
  assert.deepEqual(rendererSnapshot(structuredClone(source)),result);
});
test('ambiguous editions never collapse into one item; precise formats remain distinct', () => {
  const books=[item('book','3',{Title:'Original title',Type:'Physical'}),item('book','4',{Title:'Original title',Type:'Audiobook'})];
  const resolve=legacyKeyResolver(books,library);
  assert.equal(resolve('book:original-title'),'book:original-title');
  assert.notEqual(resolve('book:original-title:physical'),resolve('book:original-title:audiobook'));
  const games=[item(),item('game','4')];
  assert.equal(legacyKeyResolver(games,library)('game:original-title:steam'),'game:original-title:steam');
});
test('all four original v13 parser keys are recognized by compatibility mapping', () => {
  const source=readFileSync(new URL('../../app/page.tsx',import.meta.url),'utf8');
  const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const names=['safeStr','normalizeTitleKey','normalizePlatformToken','getBookFormatKeyToken','getMediaType','getMediaItemKey','buildTypedItemKey'];
  const code=ast.statements.filter(ts.isFunctionDeclaration).filter(n=>names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
  const context={stableItemKey};
  vm.runInNewContext(ts.transpileModule(code+'\nglobalThis.key=buildTypedItemKey; globalThis.detectKey=getMediaItemKey;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  const parsers=originalParsers();
  for (const [type,metadata] of [['book',{Title:'Original title',Types:'Audiobook'}],['game',{Title:'Original title',Platform:'Steam'}],['movie',{Title:'Original title',TMDB_ID:'42'}],['tv',{Title:'Original title','First Air Date':'2026-01-01'}]]) {
    const record=item(type,'3',metadata); const resolve=legacyKeyResolver([record],library);
    const parsed=parsers[type](metadata); const oldKey=context.key(parsed,type);
    assert.equal(resolve(oldKey),`${type}:db:${library}:${id}`,`${type}: ${oldKey}`);
    const groups={book:'books',movie:'movies',tv:'shows',game:'games'};
    const tagged=retainDatabaseIdentity(parsed,rendererSnapshot(snapshot([record]))[groups[type]][0]);
    assert.equal(context.key(tagged,type),`${type}:db:${library}:${id}`);
    assert.equal(context.detectKey(tagged),`${type}:db:${library}:${id}`);
  }
});
test('malformed orders are preserved and only supported settings are reconciled', () => {
  const resolve=()=> 'new';
  for (const value of ['bad','{"a":1}','[1]']) assert.equal(reconcileOrderValue('viewManualOrder:x',value,resolve),value);
  assert.equal(reconcileOrderValue('other','["old"]',resolve),'["old"]');
  assert.equal(reconcileOrderValue('smartListManualOrder:x','["old","old"]',resolve),'["new"]');
});
test('imported artwork and popup preferences remain usable with stable keys; explicit values win', () => {
  const key=`game:db:${library}:${id}`;
  const old=setting('coverOverride:game:original-title:steam','old-art');
  const initial=rendererSnapshot(snapshot([item()],[old]));
  assert.equal(initial.settings.find(s=>s.Key===`coverOverride:${key}`).Value,'old-art');
  const explicit=rendererSnapshot(snapshot([item()],[old,setting(`coverOverride:${key}`,'')]));
  assert.equal(explicit.settings.filter(s=>s.Key===`coverOverride:${key}`).length,1);
  assert.equal(explicit.settings.find(s=>s.Key===`coverOverride:${key}`).Value,'');
  assert.equal(explicit.settings.some(s=>s.Key===old.key),false);
});

test('conflicting legacy artwork aliases do not choose an arbitrary cover', () => {
  const record=item('movie','3',{Title:'Original title',TMDB_ID:'42'});
  const result=rendererSnapshot(snapshot([record],[setting('coverOverride:movie:tmdb:42','a'),setting('coverOverride:movie:original-title','b')]));
  assert.equal(result.settings.some(s=>s.Key===`coverOverride:movie:db:${library}:${id}`),false);
});
