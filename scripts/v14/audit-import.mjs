import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const media = {Books:'book', Movies:'movie', Shows:'tv', Games:'game'};
const statuses = {
 Books: ['Reading','Completed','Backlog','Abandoned','Paused','Collection','Wishlist'],
 Movies: ['Watched','Started','Backlog','Pending Digital Release','Abandoned'],
 Shows: ['Completed','Abandoned','Started','Backlog','Watch Next','Paused','Pending Return','Pending Release'],
 Games: ['Now Playing','Queued','Collection','Completed','Abandoned','Wishlist','Replay','Backlog']
};
const text = v => String(v ?? '').trim();
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function auditSnapshot(snapshot) {
 if (!snapshot || !Array.isArray(snapshot.tabs)) throw new Error('Expected a tabs array');
 const expected = [...Object.keys(media),'TV Episodes','Settings','Changelog'];
 if (snapshot.tabs.length !== expected.length || new Set(snapshot.tabs.map(t=>t.name)).size !== expected.length ||
     expected.some(name=>!snapshot.tabs.some(t=>t.name===name))) throw new Error('Snapshot must contain exactly seven source tabs');
 const issues = [], totals = {}, candidates = [];
 const issue = (tab,row,code,field) => issues.push({tab,row,code,field});
 const shows = new Map(), episodes = new Map();
 for (const tab of snapshot.tabs) {
  if (!Array.isArray(tab.values) || !Array.isArray(tab.values[0])) throw new Error('Missing headers: '+tab.name);
  const headers = tab.values[0].map(text);
  const named = headers.filter(Boolean);
  if(new Set(named).size !== named.length) issue(tab.name,1,'duplicate_headers','');
  const required = media[tab.name] ? ['Title'] : tab.name==='TV Episodes' ? ['ShowTMDB_ID','SeasonNumber','EpisodeNumber','Watched'] : tab.name==='Settings' ? ['Key','Value'] : ['Timestamp'];
  for(const h of required) if(!headers.includes(h)) issue(tab.name,1,'missing_required_header',h);
  totals[tab.name] = {nonemptyRows:0,formulaCells:0};
  const duplicates = new Map();
  for(let i=1;i<tab.values.length;i++){
   const cells = tab.values[i];
   if(!Array.isArray(cells)) throw new Error('Invalid row');
   if(!cells.some(v=>text(v)!=='')) continue;
   totals[tab.name].nonemptyRows++;
   const row=i+1;
   const get = h => text(cells[headers.indexOf(h)]);
   const first = hs => hs.map(get).find(Boolean)||'';
   for(let j=0;j<cells.length;j++) {
    if(text(cells[j]).startsWith('=')) totals[tab.name].formulaCells++;
    if(text(cells[j]) && !headers[j]) issue(tab.name,row,'populated_unnamed_column',String(j+1));
    if(/^#(REF!|VALUE!|N\/A|ERROR!|DIV\/0!|NAME\?)/.test(text(cells[j]))) issue(tab.name,row,'sheet_error',headers[j]||String(j+1));
   }
   const keyFor = (field,value) => {
    if(!value) return;
    const key=field+':'+value.toLowerCase();
    if(duplicates.has(key)) issue(tab.name,row,'duplicate_identity_candidate',field+' (first row '+duplicates.get(key)+')');
    else duplicates.set(key,row);
   };
   if(media[tab.name]){
    const title=get('Title');
    if(!title || title.startsWith('=')) issue(tab.name,row,'missing_or_formula_title','Title');
    const platform=get('Platform');
    keyFor('Title/edition',title+(tab.name==='Games'?'|'+platform:''));
    const id=first(tab.name==='Books'?['isbn','ISBN13']:tab.name==='Games'?['IGDB_ID_Override','IGDB_ID']:['TMDB_ID']);
    keyFor('Provider/edition',id ? id+(tab.name==='Games'?'|'+platform:'') : '');
    const status=first(tab.name==='Movies'?['Watch Status','WatchStatus']:tab.name==='Shows'?['WatchStatus']:['Status']);
    if(status && !statuses[tab.name].some(s=>s.toLowerCase()===status.toLowerCase())) issue(tab.name,row,'status_requires_review','Status');
    const rating=first(['My Rating','MyRating']);
    if(rating && (!Number.isFinite(Number(rating)) || Number(rating)<0 || Number(rating)>(tab.name==='Books'?5:10))) issue(tab.name,row,'invalid_personal_rating','My Rating');
    if(tab.name==='Books' && get('Type') && !['Physical','Audiobook','eBook'].includes(get('Type'))) issue(tab.name,row,'book_type_requires_review','Type');
    if(tab.name==='Books' && id && !/^(?:\d{13}|\d{9}[\dXx])$/.test(id.replace(/[- ]/g,''))) issue(tab.name,row,'isbn_requires_review','isbn/ISBN13');
    const date=first(tab.name==='Movies'?['WatchDate','Watch Date','Date Watched']:['Completed Date','Date Completed','CompletedDate']);
    if(date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) issue(tab.name,row,'date_requires_normalization','Completion date');
    if(tab.name==='Games' && first(['IGDB Rating','Rating'])) issue(tab.name,row,'external_rating_scale_review','IGDB Rating/Rating');
    if(tab.name==='Shows' && get('TMDB_ID')) shows.set(get('TMDB_ID'),(shows.get(get('TMDB_ID'))||0)+1);
    if(title && !title.startsWith('=')) candidates.push({tab:tab.name,row,mediaType:media[tab.name],sourceHash:digest({headers,cells})});
   } else if(tab.name==='Settings') keyFor('Key',get('Key'));
   else if(tab.name==='TV Episodes'){
    const show=get('ShowTMDB_ID'), season=get('SeasonNumber'), episode=get('EpisodeNumber');
    const key=show+':s'+season+':e'+episode;
    if(!show || !/^\d+$/.test(season) || !/^\d+$/.test(episode)) issue(tab.name,row,'incomplete_episode_identity','Show/season/episode');
    if(get('EpisodeKey') && get('EpisodeKey')!==key) issue(tab.name,row,'episode_key_mismatch','EpisodeKey');
    keyFor('Show/season/episode',key);
    const watched=get('Watched').toLowerCase();
    if(!['','true','false','yes','no','1','0','watched','unwatched'].includes(watched)) issue(tab.name,row,'watched_value_requires_review','Watched');
    episodes.set(row,show);
   }
  }
 }
 for(const [row,id] of episodes) if(shows.get(id)!==1) issue('TV Episodes',row,'missing_or_ambiguous_parent_show','ShowTMDB_ID');
 return {sourceSheetId:snapshot.sourceSheetId,capturedAt:snapshot.capturedAt,snapshotSha256:digest(snapshot),mode:'dry-run-no-writes',totals,candidateItems:candidates.length,issues,issueCount:issues.length,
  notes:['Sequential reads are not an atomic snapshot. Re-capture with a source-change check before import.',
  'No records merged, normalized, discarded or uploaded. Formula cells need evaluated values before canonical import.',
  'Browser-local settings and native queues are outside this audit.'],
  candidates};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 const [input,output]=process.argv.slice(2);
 if(!input||!output) throw new Error('Usage: node scripts/v14/audit-import.mjs snapshot.json NEW-report.json');
 const report=auditSnapshot(JSON.parse(readFileSync(input,'utf8')));
 writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({candidateItems:report.candidateItems,issueCount:report.issueCount,totals:report.totals}));
}
