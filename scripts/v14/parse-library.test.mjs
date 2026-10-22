import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLegacyLibrary } from '../../app/lib/v14/parse-library.ts';
import { originalParsers } from './v13-parsers.mjs';
const parsers=originalParsers();
test('actual v13 parsers retain stable identity through selection-style object spreads',()=>{
 const items=['book','movie','tv','game'].map((mediaType,index)=>({mediaType,row:{Title:'Same title',ISBN:'same',Platform:index===3?'Steam':''},identity:{itemId:String(index),libraryId:'library',revision:2}}));
 const result=parseLegacyLibrary({items,episodes:[],settingValue:()=>undefined,changeToken:'token',observedAt:'time'},parsers);
 for(const [index,type] of ['book','movie','tv','game'].entries()){
  const selected={...result.groups[type][0]};assert.equal(selected.title,'Same title');assert.equal(selected.__cdlIdentity.itemId,String(index));assert.equal(selected.__type,type);
 }
});
test('does not silently drop a rejected media row',()=>{
 assert.throws(()=>parseLegacyLibrary({items:[{mediaType:'book',row:{Title:''},identity:{}}],episodes:[]},parsers),/partial library/);
});
