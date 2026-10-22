import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedPreferenceStorage,browserPreferenceStorage} from '../../app/lib/v14/browser-storage.ts';
test('account and library preferences do not read or overwrite v13 or another account',()=>{
 const values=new Map([['cdlSettingsCache','legacy']]);
 const raw={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const a=scopedPreferenceStorage('owner-a','library',raw),b=scopedPreferenceStorage('owner-b','library',raw),c=scopedPreferenceStorage('owner-a','other',raw);
 assert.equal(a.getItem('cdlSettingsCache'),null);a.setItem('cdlSettingsCache','test');
 assert.equal(b.getItem('cdlSettingsCache'),null);assert.equal(c.getItem('cdlSettingsCache'),null);
 assert.equal(values.get('cdlSettingsCache'),'legacy');a.removeItem('cdlSettingsCache');assert.equal(values.get('cdlSettingsCache'),'legacy');
});
test('server render does not need browser storage',()=>{assert.equal(browserPreferenceStorage.getItem('x'),null);browserPreferenceStorage.setItem('x','y');});
