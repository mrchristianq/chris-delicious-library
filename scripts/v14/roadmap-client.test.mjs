import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoadmapClient} from '../../app/lib/v14/roadmap-client.ts';
const library='11111111-1111-4111-8111-111111111111';
const initial=[{id:'one',text:'First',createdAt:123,completed:false}];
function harness(){const state={items:initial,revision:null,commands:[],timeout:false};
 const client=createRoadmapClient(library,async(url,options)=>{
  assert.equal(url,`/v14/api/roadmap?libraryId=${library}`);assert.equal(options.cache,'no-store');
  if(options.method!=='PUT')return Response.json({items:state.items,revision:state.revision});
  const c=JSON.parse(options.body);state.commands.push(c);
  state.items=c.items;state.revision=(c.revision??0)+1;
  if(state.timeout){state.timeout=false;throw new Error('timeout after commit');}
  return Response.json({items:state.items,revision:state.revision,requestId:c.requestId,confirmed:true});
 });return {state,client};}
test('load uses isolated fresh endpoint; save uses loaded revision',async()=>{
 const {state,client}=harness();assert.deepEqual(await client.load(),initial);await client.save([]);assert.equal(state.commands[0].revision,null);assert.deepEqual(state.items,[]);
});
test('rapid changes serialize and freeze caller input',async()=>{
 const {state,client}=harness();await client.load();const items=structuredClone(initial);
 const first=client.save(items);items[0].text='Changed';const second=client.save(items);await Promise.all([first,second]);
 assert.deepEqual(state.commands.map(c=>c.revision),[null,1]);assert.equal(state.commands[0].items[0].text,'First');assert.equal(state.items[0].text,'Changed');
});
test('new edit first confirms pending committed command with identical request ID',async()=>{
 const {state,client}=harness();await client.load();state.timeout=true;await assert.rejects(client.save(initial));
 await client.save([]);assert.deepEqual(state.commands[0],state.commands[1]);assert.equal(state.commands[2].revision,1);
});
test('save cannot overwrite an unloaded roadmap',async()=>{const {state,client}=harness();await assert.rejects(client.save([]),/Load/);assert.equal(state.commands.length,0);});
