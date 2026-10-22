import test from 'node:test';
import assert from 'node:assert/strict';
import { freshCoverScales } from '../../app/lib/v14/cover-scale-settings.ts';

test('fresh Home and Books settings replace startup defaults; others inherit legacy scale',()=>{
 const values={'rowHeightScalePct':94,'rowHeightScalePct:home':80,'rowHeightScalePct:books':73};
 assert.deepEqual(freshCoverScales((key,fallback)=>values[key]??fallback),{home:80,books:73,movies:94,tv:94,games:94});
});
test('preserves explicit zero, rounds and clamps; malformed values use fresh fallback',()=>{
 const values={'rowHeightScalePct':90,'rowHeightScalePct:home':0,'rowHeightScalePct:books':250,'rowHeightScalePct:movies':73.6,'rowHeightScalePct:tv':'bad','rowHeightScalePct:games':false};
 assert.deepEqual(freshCoverScales((key,fallback)=>values[key]??fallback),{home:0,books:200,movies:74,tv:90,games:90});
});
test('a subsequent fresh read replaces previously applied preferences without stale merging',()=>{
 assert.equal(freshCoverScales((_key,fallback)=>fallback).home,100);
 assert.equal(freshCoverScales((key,fallback)=>key==='rowHeightScalePct:home'?80:fallback).home,80);
 assert.equal(freshCoverScales((_key,fallback)=>fallback).home,100);
});
