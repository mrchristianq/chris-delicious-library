import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Execute the real hydration effect, not a duplicated version of its logic.
const source=readFileSync(new URL('../../app/page.tsx',import.meta.url),'utf8');
const file=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){
  if(ts.isCallExpression(node)&&node.expression.getText(file)==='useEffect'){
    const candidate=node.arguments[0];
    if(candidate?.getText(file).includes('const existingManualOrderKeys =')) callback=candidate.getText(file);
  }
  ts.forEachChild(node,visit);
}
visit(file);
assert.ok(callback,'backlog manual-order hydration effect exists');
const js=ts.transpileModule(`const effect = ${callback};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function hydrate(active, saved, local=['b','a'], nav='play-next'){
  const writes=[];
  const bindings={
    nav, libraryBackend:{}, wishlistPointerDragRef:{current:active?{active:true}:null},
    playNextManualOrderKeys:local, getSetting:(key,fallback)=>saved[key]??fallback,
    safeStr:value=>String(value??''), MANUAL_SORT_FIELD:'Manual',
    PLAY_NEXT_SORT_FIELD_SETTING_KEY:'viewSortField:play-next',
    PLAY_NEXT_SORT_ORDER_SETTING_KEY:'viewSortOrder:play-next',
    PLAY_NEXT_MANUAL_ORDER_SETTING_KEY:'viewManualOrder:play-next',
    setSortField:value=>writes.push(['field',value]),
    setSortOrder:value=>writes.push(['direction',value]),
    setPlayNextManualOrderKeys:value=>writes.push(['order',value]),
  };
  new Function(...Object.keys(bindings),`${js}\neffect();`)(...Object.values(bindings));
  return writes;
}
test('active drag keeps immediate local movement despite old saved order',()=>{
  assert.deepEqual(hydrate(true,{'viewManualOrder:play-next':'["a","b"]'}),[]);
});
test('outside drag fresh saved order still hydrates',()=>{
  assert.deepEqual(hydrate(false,{'viewManualOrder:play-next':'["a","b"]'}).at(-1),['order',['a','b']]);
});
test('drop-time pending order matching local state is not reset',()=>{
  assert.equal(hydrate(false,{'viewManualOrder:play-next':'["b","a"]'}).some(([key])=>key==='order'),false);
});
for(const view of ['wishlist','now-playing','wishlist-books','watchlist-movies','watchlist-tv']){
  test(`${view}: hydration also leaves the active drag alone`,()=>{
    assert.deepEqual(hydrate(true,{},['b','a'],view),[]);
  });
}
