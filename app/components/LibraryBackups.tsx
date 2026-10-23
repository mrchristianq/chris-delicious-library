'use client';
import {useRef,useState} from 'react';
type Summary={total:number;books:number;movies:number;shows:number;games:number;notes:number;episodeProgress:number};
type Backup={id:string;capturedAt:string;bytes:number;counts:Record<string,number>;summary?:Summary;kind?:string};
type Preview={token?:string;canRestore:boolean;notice?:string;backupId:string;capturedAt:string;summary:Summary;changes:{added:number;removed:number;updated:number;settingsChanged:boolean;episodeProgressChanged:boolean}|null};
export function LibraryBackups({libraryId}:{libraryId:string}){
 const [backups,setBackups]=useState<Backup[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [preview,setPreview]=useState<Preview|null>(null),[confirmed,setConfirmed]=useState(false),[restored,setRestored]=useState(false);
 const pending=useRef(false),createId=useRef<string|null>(null);
 async function load(){
  const response=await fetch(`/v14/api/backups?libraryId=${encodeURIComponent(libraryId)}`,{cache:'no-store'}),data=await response.json();
  if(!response.ok||!Array.isArray(data.backups))throw Error('Could not confirm the backup list. Please retry.');setBackups(data.backups);
 }
 async function run(action:()=>Promise<void>){if(pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Recovery not confirmed.');}finally{pending.current=false;setBusy(false);}}
 async function command(action:string,extra:Record<string,string>={}){
  const response=await fetch('/v14/api/backups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({libraryId,action,requestId:action==='create'?(createId.current??=crypto.randomUUID()):crypto.randomUUID(),...extra})}),data=await response.json();
  if(!response.ok)throw Error(data.error??'Recovery not confirmed.');return data;
 }
 return <section className="backups" aria-label="Library backups">
  <div className="backupActions"><div><h2>Your library, safely saved</h2><p>Weekly backups · 10 most recent scheduled versions. Manual and safety backups are kept separately.</p></div>
   <button className="primary" disabled={busy||restored} onClick={()=>void run(async()=>{const result=await command('create');if(result.confirmed!==true)throw Error('Backup was not confirmed.');createId.current=null;setMessage('Backup saved and verified.');await load();})}>Back Up Now</button>
   <button disabled={busy} onClick={()=>void run(load)}>Restore a Backup</button>
  </div>
  {busy?<p role="status">Checking and verifying your library…</p>:null}
  {error?<p className="error" role="alert">{error}</p>:null}{message?<p role="status">{message}</p>:null}
  {backups?.length===0?<p>No verified backups are available yet. Create your first backup above.</p>:null}
  {backups?.map(backup=><article key={backup.id} className="backupRow">
   <span className="backupIcon" aria-hidden>↶</span><div className="copy"><h3>{new Date(backup.capturedAt).toLocaleString()}</h3><p>{backup.kind==='manual'?'Manual backup':backup.kind==='before-restore'?'Before restore · safety backup':'Weekly backup'} · {(backup.bytes/1048576).toFixed(1)} MB</p>
    <p>{backup.summary?`${backup.summary.total.toLocaleString()} items · ${backup.summary.books} books · ${backup.summary.movies} movies · ${backup.summary.shows} TV shows · ${backup.summary.games} games`:`${(backup.counts.items??0).toLocaleString()} stored items (including archived) · ${(backup.counts.episode_progress??0).toLocaleString()} episode progress records`}</p>
   </div><a href={`/v14/api/backups?libraryId=${encodeURIComponent(libraryId)}&id=${encodeURIComponent(backup.id)}`} download>Download</a>
   <button disabled={busy||restored} onClick={()=>void run(async()=>{setPreview(null);setConfirmed(false);const response=await fetch(`/v14/api/backups?libraryId=${encodeURIComponent(libraryId)}&id=${encodeURIComponent(backup.id)}&preview=true`,{cache:'no-store'});const result=await response.json();if(!response.ok||!result.summary)throw Error(result.error??'Preview not confirmed.');setPreview(result);})}>Review & Restore</button>
  </article>)}
  {preview&&!restored?<section className="restorePreview" aria-label="Confirm library restore">
   <h3>Restore {new Date(preview.capturedAt).toLocaleString()}?</h3>
   {preview.notice?<p role="status">{preview.notice}</p>:null}
   {preview.changes?<p>{preview.changes.added} items return · {preview.changes.updated} items change · {preview.changes.removed} items leave the active library.</p>:null}
   <p>{preview.summary.total.toLocaleString()} items in this version. Notes, settings, cover references, collections and episode progress are included.</p>
   <p>{preview.summary.books} books · {preview.summary.movies} movies · {preview.summary.shows} TV shows · {preview.summary.games} games</p>
   {preview.changes&&(preview.changes.episodeProgressChanged||preview.changes.settingsChanged)?<p>{[preview.changes.episodeProgressChanged?'Episode progress changes':null,preview.changes.settingsChanged?'Settings change':null].filter(Boolean).join(' · ')}</p>:null}
   <p>A verified backup of your current library is created first. Google Sheets stays unchanged and nightly sync will be paused. Close other app tabs before restoring.</p>
   <label><input type="checkbox" checked={confirmed} disabled={busy||!preview.canRestore} onChange={e=>setConfirmed(e.target.checked)}/> I want to replace my current library with this version.</label>
   <div className="backupActions"><button disabled={busy} onClick={()=>setPreview(null)}>Cancel</button><button className="primary" disabled={!confirmed||busy||!preview.canRestore} onClick={()=>void run(async()=>{const token=preview.token;if(!token){const prepared=await command('preview',{backupId:preview.backupId});if(typeof prepared.token!=='string'||!prepared.changes)throw Error('Safety check was not confirmed.');setPreview({...preview,...prepared});setConfirmed(false);setMessage('Safety check complete. Review the refreshed comparison and confirm before restoring.');return;}const result=await command('restore',{backupId:preview.backupId,token});if(result.confirmed!==true||result.token!==token)throw Error('Restore confirmation unavailable. Retry to check the same restore.');setRestored(true);setMessage('Library restored and verified. Your pre-restore backup is available below. Nightly sync is paused; Google Sheets has not changed.');await load();})}>{preview.token?'Restore This Version':'Continue to Restore Confirmation'}</button></div>
  </section>:null}
  {restored?<button className="primary" onClick={()=>window.location.reload()}>Reload Restored Library</button>:null}
  <style jsx>{`
   .backups{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px;color:var(--text)}h2{font-size:18px;margin:0}h3{font-size:14px;margin:0}p{font-size:13px;color:var(--muted);line-height:1.5;margin:6px 0}.backupActions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.backupActions>div:first-child{flex:1;min-width:200px}button,a{font:inherit;font-size:13px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:11px;cursor:pointer;color:var(--text);background:var(--surface);border:1px solid var(--line);text-decoration:none}button:disabled{opacity:.45;cursor:not-allowed}.primary{background:linear-gradient(#579fff,#3188ee);color:white;border-color:#4495f7}.backupRow{display:flex;align-items:center;gap:14px;border-top:1px solid var(--line);padding:16px 0;margin-top:12px}.copy{flex:1;min-width:0}.backupIcon{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#3492ff18;color:#2684ef;font-size:26px}.restorePreview{margin-top:20px;padding:18px;border:1px solid #e59b3e66;border-radius:14px;background:#e59b3e0a}.restorePreview label{display:flex;align-items:center;gap:10px;min-height:48px;font-size:14px;margin:12px 0}.restorePreview input{width:22px;height:22px;accent-color:#3492ff}.error{color:#c65d33}button:focus-visible,a:focus-visible{outline:3px solid #3492ff;outline-offset:2px}@media(max-width:700px){.backups{padding:14px}.backupRow{flex-wrap:wrap}.copy{flex-basis:calc(100% - 60px)}.backupRow button,.backupRow a,.backupActions>button{flex:1}.backupActions>div:first-child{flex-basis:100%}}
  `}</style>
 </section>;
}
