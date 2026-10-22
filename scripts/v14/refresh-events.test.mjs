import test from 'node:test';
import assert from 'node:assert/strict';
import {subscribeLibraryRefresh} from '../../app/lib/v14/refresh-events.ts';
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
test('focus and visibility activation coalesce; reconnect reads again',async()=>{
 const win=new EventTarget(),doc=Object.assign(new EventTarget(),{visibilityState:'visible'});let calls=0;
 const dispose=subscribeLibraryRefresh(win,doc,()=>calls++);
 win.dispatchEvent(new Event('focus'));doc.dispatchEvent(new Event('visibilitychange'));await tick();assert.equal(calls,1);
 win.dispatchEvent(new Event('online'));await tick();assert.equal(calls,2);dispose();
});
test('hidden tabs defer refresh until visible; unmount cancels pending work and removes listeners',async()=>{
 const win=new EventTarget(),doc=Object.assign(new EventTarget(),{visibilityState:'hidden'});let calls=0;
 const dispose=subscribeLibraryRefresh(win,doc,()=>calls++);
 win.dispatchEvent(new Event('online'));await tick();assert.equal(calls,0);
 doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));dispose();await tick();assert.equal(calls,0);
 win.dispatchEvent(new Event('focus'));win.dispatchEvent(new Event('online'));doc.dispatchEvent(new Event('visibilitychange'));await tick();assert.equal(calls,0);
});
