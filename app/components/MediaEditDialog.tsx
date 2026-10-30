"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./MediaEditDialog.css";
import { createPortal } from "react-dom";
import { editorSections, type EditorArtworkDraft, type EditorField, type EditorMedia } from "../lib/v14/editor-layout";
import { useLibraryBackend } from "../lib/v14/backend-context";

type Props = {
  media: EditorMedia; isDark?:boolean; isNew?: boolean; fields: EditorField[]; values: Record<string,string>; initialValues: Record<string,string>;
  onChange: (key:string,value:string)=>void; onClose: ()=>void; onSave:(artwork?:EditorArtworkDraft)=>Promise<void>;
  cover: string; defaultCover: string; saving: boolean; syncing: boolean; error?:string|null; notice?:string|null;
  refresh: {label:string; onClick:()=>void}[]; review?:ReactNode; onEpisodes?:()=>void;
};
const names = {book:"Book",movie:"Movie",tv:"TV Show",game:"Game"};
const symbols = {book:"📖",movie:"🎬",tv:"📺",game:"🎮"};
const accents = {book:"#52a26b",movie:"#a168d6",tv:"#f39636",game:"#3492ff"};

export function MediaEditDialog(p:Props) {
  const backend=useLibraryBackend();
  const dialog=useRef<HTMLDialogElement>(null), fileInput=useRef<HTMLInputElement>(null);
  const original=useRef({...p.initialValues});
  const [draft,setDraft]=useState<EditorArtworkDraft>();
  const [preview,setPreview]=useState("");
  const [editMetadata,setEditMetadata]=useState(false);
  const [discard,setDiscard]=useState(false);
  const id=useId();
  const busy=p.saving||p.syncing;
  const dirty=!!draft || Object.keys({...original.current,...p.values}).some(key=>original.current[key]!==p.values[key]);
  const sections=editorSections(p.media,p.fields,p.values);
  useEffect(()=>{
    const d=dialog.current, previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const overflow=document.body.style.overflow;
    d?.showModal(); document.body.style.overflow="hidden";
    return ()=>{d?.close();document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  useEffect(()=>()=>{if(preview.startsWith("blob:"))URL.revokeObjectURL(preview);},[preview]);
  const close=()=>{if(busy)return;if(dirty)setDiscard(true);else p.onClose();};
  const input=(field:EditorField,readOnly=false)=>{
    const value=p.values[field.key]??"";
    if(field.key==="type" && p.media==="book") return <div className="formats" role="group" aria-label="Book format">{field.options?.map(option=><button type="button" key={option} disabled={busy} aria-pressed={value===option} onClick={()=>p.onChange(field.key,option)}>{option}</button>)}</div>;
    const common={id:`${id}-${field.key}`,name:field.key,value,disabled:busy,onChange:(event:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>p.onChange(field.key,event.target.value)};
    if(field.multiline) return <textarea {...common} readOnly={readOnly} rows={field.key==="notes"?4:3} placeholder={field.placeholder}/>;
    if(field.options) return <select {...common} disabled={busy||readOnly}>{!field.options.includes(value)?<option value={value}>{value||"Choose…"}</option>:null}{field.options.map(option=><option key={option} value={option}>{option}</option>)}</select>;
    if(field.isFlag) return <input {...common} type="text" readOnly={readOnly}/>;
    if(field.key==="myRating") return <div className="rating"><span aria-hidden>★</span><input {...common} type="number" inputMode="decimal" step="0.1" min="0" max={p.media==="book"?5:10} placeholder="Not rated"/><span>/ {p.media==="book"?5:10}</span></div>;
    return <input {...common} readOnly={readOnly} type={field.isDate?"date":"text"} inputMode={field.key==="hoursPlayed"?"decimal":undefined} placeholder={field.key==="tags"||field.key==="tag"?"Add tags, separated by commas":field.placeholder}/>;
  };
  const row=(field:EditorField,readOnly=false)=><label className={`field ${field.multiline?"multiline":""}`} key={field.key} htmlFor={`${id}-${field.key}`}><span>{field.key==="type"?"Format":field.key==="watchStatus"?"Watch status":field.key==="myRating"?"My rating":field.key==="status"&&p.media==="book"?"Reading status":field.label}</span>{input(field,readOnly)}</label>;
  const disclosure=(title:string,description:string,fields:EditorField[],sources=false)=><details className="disclosure"><summary><span className="disclosureIcon" aria-hidden>{sources?"▧":"≡"}</span><span><strong>{title}</strong><small>{description}</small></span><span className="chevron" aria-hidden>›</span></summary><div className="expanded">{!sources?<div className="metadataActions"><button type="button" disabled={busy} aria-pressed={editMetadata} onClick={()=>setEditMetadata(!editMetadata)}>{editMetadata?"Finish editing details":"Edit details"}</button>{p.refresh.map(action=><button key={action.label} type="button" disabled={busy} onClick={action.onClick}>{p.syncing?"Checking…":action.label}</button>)}</div>:<p className="hint">Advanced artwork and matching fields. Changes are saved with this item.</p>}<div className="metadataFields">{fields.map(field=>row(field,!sources&&!editMetadata))}</div>{sources&&p.defaultCover?<button className="defaultArtwork" type="button" disabled={busy||!backend} onClick={()=>{setDraft({cover:p.defaultCover});setPreview("");}}>Use metadata artwork on save</button>:null}</div></details>;
  if(typeof document==="undefined")return null;
  return createPortal(<dialog ref={dialog} className={`cdlMediaEditor ${p.isDark?"dark":""}`} aria-labelledby={`${id}-title`} style={{"--accent":accents[p.media]} as React.CSSProperties} onCancel={event=>{event.preventDefault();close();}} onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <form onSubmit={event=>{event.preventDefault();if(!busy)void p.onSave(draft);}}>
      <header><span className="heroIcon" aria-hidden>{symbols[p.media]}</span><h1 id={`${id}-title`}>{p.isNew?"Add":"Edit"} {names[p.media]}</h1><button type="button" className="close" aria-label="Close editor" onClick={close} disabled={busy}>×</button></header>
      <div className="scrollArea">
        <div className="editorLayout"><aside><div className="poster">{(draft?.cover instanceof File?preview:typeof draft?.cover==="string"?draft.cover:p.cover)?<img src={draft?.cover instanceof File?preview:typeof draft?.cover==="string"?draft.cover:p.cover} alt={`${p.values.title||names[p.media]} cover`}/>:<span className="emptyCover">{symbols[p.media]}<small>No artwork selected</small></span>}</div>
          <button type="button" className="artworkButton" disabled={busy||!backend} onClick={()=>fileInput.current?.click()}>▧ Change artwork</button>
          <input ref={fileInput} type="file" accept="image/*" aria-label="Choose custom artwork" hidden onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file){setDraft({cover:file});setPreview(URL.createObjectURL(file));}}}/>
          {draft?<div className="artworkNote"><span>Artwork ready to save</span><button type="button" disabled={busy} onClick={()=>{setDraft(undefined);setPreview("");}}>Undo</button></div>:<small className="artworkNote">{p.cover?"Current artwork":"Add artwork whenever you like"}</small>}
        </aside><div className="yourFields"><label className="identity" htmlFor={`${id}-title-input`}><span className="srOnly">Title</span><input id={`${id}-title-input`} aria-label="Title" required value={p.values.title??""} disabled={busy} placeholder="Title" onChange={e=>p.onChange("title",e.target.value)}/></label>
          {p.media==="book"?<div className="group author">{row({key:"author",label:"Author"})}</div>:null}
          <h2>Your library</h2><div className="group">{sections.personal.map(field=>row(field))}{p.onEpisodes?<button type="button" className="episodeRow" disabled={busy||dirty} onClick={p.onEpisodes}><span>Episode progress</span><span>Manage episodes ›</span></button>:null}</div>
          {p.onEpisodes&&dirty?<p className="hint">Save or discard your changes before opening episode progress.</p>:null}
          <h2>My Review / Notes</h2><label className="notes" htmlFor={`${id}-notes`}><span className="srOnly">My Review / Notes</span>{input({key:"notes",label:"My Review / Notes",multiline:true,placeholder:"Add your thoughts, review, or personal notes…"})}</label>
        </div></div>
        <div className="advanced">{disclosure("Details & metadata",p.media==="book"?"Series, pages, genres and description":p.media==="game"?"Release, developer, genres and description":"Release information, genres and description",sections.metadata)}
          {disclosure("Artwork & sources","Cover, background and provider connection",sections.sources,true)}

        </div>
        {p.review?<section className="providerReview" aria-label="Review metadata changes">{p.review}</section>:null}
      </div>
      <footer>{p.error?<p className="error" role="alert">{p.error}</p>:p.notice?<p className="hint" role="status">{p.notice}</p>:null}{discard?<div className="discard" role="alert"><span>Discard unsaved changes?</span><button type="button" onClick={()=>setDiscard(false)}>Keep editing</button><button type="button" onClick={p.onClose}>Discard</button></div>:<div className="footerActions"><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="primary" disabled={busy}>{p.saving?"Saving…":p.isNew?"Add to Library":"Save Changes"}</button></div>}</footer>
    </form>

  </dialog>,document.body);
}
