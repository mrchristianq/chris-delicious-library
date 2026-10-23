'use client';
import {useState} from 'react';
type Backup={id:string;capturedAt:string;bytes:number;counts:Record<string,number>};
export function LibraryBackups({libraryId}:{libraryId:string}){
 const [backups,setBackups]=useState<Backup[]|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function load(){
  setLoading(true);setError('');
  try{const response=await fetch(`/v14/api/backups?libraryId=${encodeURIComponent(libraryId)}`,{cache:'no-store'});const data=await response.json();if(!response.ok||!Array.isArray(data.backups))throw new Error('Backup list unavailable.');setBackups(data.backups);}
  catch{setError('Could not confirm the backup list. Please retry.');}finally{setLoading(false);}
 }
 return <section style={{fontSize:13,margin:'12px 0 20px'}} aria-label="Library recovery backups">
  <button type="button" onClick={()=>void load()} disabled={loading} style={{font:'inherit',color:'inherit',background:'transparent',border:'1px solid currentColor',borderRadius:10,padding:'10px 14px',minHeight:44,cursor:'pointer'}}>{loading?'Checking backups…':'View / download backups'}</button>
  {error?<p role="alert">{error}</p>:null}
  {backups?<><p>Weekly full backups · 10 most recent retained. Your original migration backup is kept separately and is never rotated.</p>
   {backups.length?<ul style={{paddingLeft:20}}>{backups.map(backup=><li key={backup.id} style={{marginBottom:12}}><a style={{color:'inherit',display:'inline-flex',alignItems:'center',minHeight:44}} href={`/v14/api/backups?libraryId=${encodeURIComponent(libraryId)}&id=${encodeURIComponent(backup.id)}`} download>Download {new Date(backup.capturedAt).toLocaleString()} · {(backup.bytes/1048576).toFixed(1)} MB</a></li>)}</ul>:<p>No confirmed weekly backup is available yet.</p>}
   <p>To recover: download a backup, restore it into an isolated test library, verify items, notes and episode progress, then approve replacing the live library. Downloading never changes your library. This is not a one-click live restore.</p>
  </>:null}
 </section>;
}
