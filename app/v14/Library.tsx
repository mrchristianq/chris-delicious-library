"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { itemCover, toRatingItem, type V14Item, type V14RatingInput } from "../lib/v14/items";
import { saveRating } from "./actions";

const RateItModal = dynamic(() => import("../components/RateItModal").then(m => m.RateItModal), { ssr: false });
const colors = { book: "#5fb85c", movie: "#a168d6", tv: "#ff9934", game: "#3492ff" };

export function Library({ items, total, query, mediaType, offset }: { items: V14Item[]; total: number; query: string; mediaType: string; offset: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<V14Item | null>(null);
  const [message, setMessage] = useState("");
  const pending = useRef<{ payload: string; id: string } | null>(null);
  async function save(data: V14RatingInput) {
    if (!selected) return;
    const payload = JSON.stringify({ id: selected.id, revision: selected.revision, data });
    if (pending.current?.payload !== payload) pending.current = { payload, id: crypto.randomUUID() };
    const confirmed = await saveRating(selected.id, selected.revision, pending.current.id, data);
    setSelected(confirmed);
    setMessage(`Saved and verified in Supabase: ${confirmed.title}. Sheet sync is off.`);
    router.refresh();
  }
  const href = (pageOffset: number) => `/v14?${new URLSearchParams({ q: query, type: mediaType, offset: String(pageOffset) })}`;
  return <section className="v14-library">
    <form action="/v14" className="v14-toolbar">
      <label>Search<input name="q" defaultValue={query} placeholder="Search your library…" maxLength={200} /></label>
      <label>Media<select name="type" defaultValue={mediaType}><option value="">Everything</option><option value="book">Books</option><option value="movie">Movies</option><option value="tv">TV Shows</option><option value="game">Games</option></select></label>
      <button>Apply</button><span>{total.toLocaleString()} items</span>
    </form>
    <p role="status">{message}</p>
    <p className="v14-scope">Migration test: browse and edit ratings, status, completion dates and notes using the existing Rate It editor. Full navigation, add/delete, episode editing and Sheet sync are still being connected.</p>
    <div className="v14-grid">{items.map(item => {
      const cover = itemCover(item);
      return <button className="v14-cover-card" key={item.id} onClick={() => { pending.current = null; setSelected(item); }} aria-label={`Rate or edit ${item.title}`}>
        <div className="v14-cover">{cover ? <img src={cover} alt="" loading="lazy" /> : <span>No cover</span>}</div>
        <strong>{item.title}</strong><span style={{color:colors[item.media_type]}}>{item.user_status || "No status"}</span>
        <span>{item.personal_rating !== null ? `${item.personal_rating}/${item.media_type === "book" ? 5 : 10}` : "Not rated"}</span>
      </button>;
    })}</div>
    {items.length === 0 ? <p>No matching items.</p> : null}
    <nav className="v14-paging" aria-label="Library pages">
      {offset > 0 ? <a href={href(Math.max(0,offset-60))}>Previous</a> : null}
      <span>{total ? offset+1 : 0}–{Math.min(offset+60,total)} of {total}</span>
      {offset+60 < total ? <a href={href(offset+60)}>Next</a> : null}
    </nav>
    {selected ? <RateItModal open onClose={() => setSelected(null)} onSave={save} item={toRatingItem(selected)} mediaType={selected.media_type} highlightColor={colors[selected.media_type]} coverUrl={itemCover(selected)} saveDestination="Supabase" /> : null}
  </section>;
}
