export const fixtureOwner='baf0dab8-9904-48f2-a00f-30773bfc6ae1',fixtureLibrary='9fdfae4a-31f5-5c8f-aa64-af839a853b48';
const medias=['game','tv','book','movie'],names=['Games','Shows','Books','Movies'];
export const fixtureItems=()=>medias.map((media,index)=>({id:`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,library_id:fixtureLibrary,media_type:media,title:`ISOLATED sync fixture ${media}`,revision:1,user_status:media==='game'?'Now Playing':media==='book'?'Reading':'Started',personal_rating:media==='book'?4:8,completed_on:null,notes:'PRIVATE NOTES MUST SURVIVE',user_fields:media==='game'?{Platform:'Steam'}:media==='book'?{Type:'Audiobook'}:{},metadata:media==='game'?{IGDB_ID:'999991','Hours Played':'10'}:media==='book'?{isbn:'999992'}:{TMDB_ID:'999993',NumberOfEpisodes:'10'}}));
export function fixtureTables(items=fixtureItems()){
 return items.map((item,index)=>{
  const media=item.media_type,identity=media==='game'?['Platform','IGDB_ID']:media==='book'?['Type','isbn']:['TMDB_ID'];
  const status=media==='game'||media==='book'?'Status':media==='movie'?'Watch Status':'WatchStatus';
  const date=media==='movie'?'WatchDate':'Completed Date';
  const headers=['Title',...identity,status,'My Rating',date,...(media==='game'?['Hours Played','Completed']:media==='tv'?['NumberOfEpisodes']:[])];
  const values={Title:item.title,...item.metadata,...item.user_fields,[status]:item.user_status,'My Rating':String(item.personal_rating),[date]:'',Completed:'false'};
  return {name:names[index],headers,rows:[headers.map(h=>values[h]??'')]};
 });
}
export function fixtureBaseline(items=fixtureItems(),tables=fixtureTables(items)){
 return {ownerId:fixtureOwner,libraryId:fixtureLibrary,targetId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',sheetId:'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0',lastConfirmedSync:'2026-10-19T23:38:36Z',columns:Object.fromEntries(tables.map(t=>[t.name,t.headers.slice()])),records:items.map((item,n)=>({itemId:item.id,media:item.media_type,confirmedAt:'2026-10-19T23:38:36Z',fields:Object.fromEntries(tables[n].headers.map((h,i)=>[h,h==='My Rating'||h==='Hours Played'||h==='NumberOfEpisodes'?Number(tables[n].rows[0][i]):h==='Completed'?false:tables[n].rows[0][i]]))}))};
}
export function changeFixture(tables,index,header,value){const table=tables[index];table.rows[0][table.headers.indexOf(header)]=String(value);}
