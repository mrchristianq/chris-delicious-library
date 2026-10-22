import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACKER_ID,TRACKER_ACCOUNT,TRACKER_SCOPE,TRACKER_TABS,inspectTracker,validateTrackerManifest} from '../../app/lib/v14/tracker-read.ts';
const headers={Games:['Title','IGDB_ID','Platform','Status'],Shows:['Title','TMDB_ID'],Books:['Title','isbn','Type'],Movies:['Title','TMDB_ID']};
const fixture=()=>({metadata:{spreadsheetId:TRACKER_ID,sheets:TRACKER_TABS.map((title,i)=>({properties:{title,sheetId:i,gridProperties:{columnCount:headers[title].length}}}))},values:{spreadsheetId:TRACKER_ID,valueRanges:TRACKER_TABS.map(name=>({range:`${name}!A1:D1`,values:[headers[name]]}))}});
const transport=f=>async url=>url.includes('values:batchGet')?f.values:f.metadata;
test('auxiliary tabs are ignored in header and full reads, never included in source grids',async()=>{
 const f=fixture();for(const sheet of f.metadata.sheets)sheet.properties.gridProperties.rowCount=3;
 f.metadata.sheets.splice(1,0,{properties:{title:'ChangeLog',sheetId:99,gridProperties:{columnCount:1000,rowCount:100000}}});
 const calls=[];const read=async url=>{calls.push(url);return transport(f)(url);};
 const header=await inspectTracker(read);const full=await inspectTracker(read,true);
 assert.deepEqual(header.tabs.map(t=>t.name),TRACKER_TABS);
 assert.deepEqual(full.tables.map(t=>t.name),TRACKER_TABS);
 assert.deepEqual(full.grids.map(t=>t.title),TRACKER_TABS);
 for(const url of calls)for(const range of new URL(url).searchParams.getAll('ranges'))assert.match(range,/^'(Games|Shows|Books|Movies)'!/);
 assert.equal(full.grids.some(g=>g.sheetId===99),false);
});
test('extra tabs never conceal a missing or duplicate approved tab',async()=>{
 for(const duplicate of [false,true]){
  const f=fixture();f.metadata.sheets.push({properties:{title:'ChangeLog',sheetId:99}});
  if(duplicate)f.metadata.sheets.push(structuredClone(f.metadata.sheets[0]));else f.metadata.sheets.shift();
  await assert.rejects(inspectTracker(transport(f)),/tabs changed/);
 }
});
test('fresh header inspection uses only the pinned tracker and bounded ranges',async()=>{
 const calls=[],f=fixture();const result=await inspectTracker(async url=>{calls.push(url);return transport(f)(url);});
 assert.deepEqual(result.tabs.map(t=>t.name),TRACKER_TABS);assert.equal(calls.length,2);
 for(const url of calls){assert.ok(url.startsWith(`https://sheets.googleapis.com/v4/spreadsheets/${TRACKER_ID}`));assert.equal(url.includes('1Kh_wLgr'),false);}
 assert.deepEqual(new URL(calls[1]).searchParams.getAll('ranges'),["'Games'!A1:D1","'Shows'!A1:B1","'Books'!A1:C1","'Movies'!A1:B1"]);
});
test('wrong Sheet, tabs, missing identities, duplicate headers and excluded columns fail closed',async()=>{
 for(const mutate of [f=>f.metadata.spreadsheetId='original',f=>f.metadata.sheets.pop(),f=>f.values.valueRanges.pop(),f=>f.values.valueRanges[0].values[0]=['Title','Platform'],f=>f.values.valueRanges[0].values[0]=['Title','IGDB_ID','Platform','Title'],f=>f.values.valueRanges[0].values[0]=['Title','IGDB_ID','Platform','Notes'],f=>f.metadata.sheets[0].properties.gridProperties.columnCount=1000]){
  const f=fixture();mutate(f);await assert.rejects(inspectTracker(transport(f)));
 }
});
test('reads are fresh every time and transport failure never falls back to earlier data',async()=>{
 let calls=0;const read=async url=>{calls++;return transport(fixture())(url);};await inspectTracker(read);await inspectTracker(read);assert.equal(calls,4);
 await assert.rejects(inspectTracker(async()=>{throw new Error('offline');}),/offline/);
});
test('credential manifest cannot switch target, account or broaden the OAuth scope',()=>{
 const config={serviceAccount:TRACKER_ACCOUNT,trackerId:TRACKER_ID,scope:TRACKER_SCOPE,keyId:'a'.repeat(40),privateKeyFile:'/private/key.pem'};
 assert.equal(validateTrackerManifest(config).scope,TRACKER_SCOPE);
 for(const [key,value] of [['serviceAccount','another@example.com'],['trackerId','original'],['scope','https://www.googleapis.com/auth/spreadsheets'],['keyId','bad'],['privateKeyFile','relative']])assert.throws(()=>validateTrackerManifest({...config,[key]:value}));
});
test('full preview data is bounded and requires repeatable values and unchanged structure',async()=>{
 const f=fixture();for(const sheet of f.metadata.sheets)sheet.properties.gridProperties.rowCount=3;
 const headerRange=url=>new URL(url).searchParams.getAll('ranges')[0]?.endsWith('D1');
 const data=structuredClone(f.values);data.valueRanges[0].values.push(['Fixture','123','Steam',false]);
 const stable=async url=>!url.includes('values:batchGet')?f.metadata:headerRange(url)?f.values:data;
 const result=await inspectTracker(stable,true);assert.equal(result.tables[0].rows[0][3],'false');
 let reads=0;
 await assert.rejects(inspectTracker(async url=>{
  if(!url.includes('values:batchGet')||headerRange(url))return stable(url);
  const next=structuredClone(data);if(++reads===2)next.valueRanges[0].values[1][0]='Changed';return next;
 },true),/changed while reading/);
 let metaReads=0;
 await assert.rejects(inspectTracker(async url=>{
  const next=structuredClone(await stable(url));if(!url.includes('values:batchGet')&&++metaReads===2)next.sheets[0].properties.gridProperties.rowCount=4;return next;
 },true),/structure changed/);
 f.metadata.sheets[0].properties.gridProperties.rowCount=5001;
 await assert.rejects(inspectTracker(stable,true),/height/);
});
test('date serials use their actual year without reinterpreting identifiers or text dates',async()=>{
 const f=fixture();
 const h=['Title','IGDB_ID','Platform','ReleaseDate','Year'];
 f.metadata.sheets[0].properties.gridProperties.columnCount=5;
 f.values.valueRanges[0].values=[h];
 for(const sheet of f.metadata.sheets)sheet.properties.gridProperties.rowCount=3;
 const data=structuredClone(f.values);
 const serial=(Date.UTC(2026,1,1)-Date.UTC(1899,11,30))/86400000;
 data.valueRanges[0].values.push(['Fixture',serial,'Steam',serial,serial],['Literal',123,'Steam','2/1/26',2026]);
 const displayed=structuredClone(data);displayed.valueRanges[0].values[1][4]='2026';
 const result=await inspectTracker(async url=>{
  if(!url.includes('values:batchGet'))return f.metadata;
  const query=new URL(url).searchParams;
  if(query.getAll('ranges')[0].endsWith('E1'))return f.values;
  if(query.get('valueRenderOption')==='FORMATTED_VALUE')return displayed;
  assert.equal(query.get('valueRenderOption'),'UNFORMATTED_VALUE');
  assert.equal(query.get('dateTimeRenderOption'),'SERIAL_NUMBER');
  return data;
 },true);
 assert.equal(result.tables[0].rows[0][3],'2026-02-01');
 assert.equal(result.tables[0].rows[0][1],String(serial));
 assert.equal(result.tables[0].rows[1][3],'2/1/26');
 assert.equal(result.tables[0].rows[0][4],'2026');
 assert.equal(result.tables[0].rows[1][4],'2026');
});
test('numeric title cells use the verified displayed title, not a guessed date or raw serial',async()=>{
 const f=fixture();for(const sheet of f.metadata.sheets)sheet.properties.gridProperties.rowCount=3;
 const data=structuredClone(f.values);data.valueRanges[0].values.push([41255,123,'Steam','Collection']);
 const formatted=structuredClone(data);formatted.valueRanges[0].values[1][0]='12 12 12';
 const read=async url=>{
  if(!url.includes('values:batchGet'))return f.metadata;
  const p=new URL(url).searchParams;
  if(p.getAll('ranges')[0].endsWith('D1'))return f.values;
  return p.get('valueRenderOption')==='FORMATTED_VALUE'?formatted:data;
 };
 const result=await inspectTracker(read,true);assert.equal(result.tables[0].rows[0][0],'12 12 12');assert.equal(result.tables[0].rows[0][1],'123');
 formatted.valueRanges[0].values[1][0]='';await assert.rejects(inspectTracker(read,true),/title requires review/);
});
