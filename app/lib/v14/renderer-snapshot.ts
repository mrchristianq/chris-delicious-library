import { projectLibrarySnapshot, type LibrarySnapshot } from "./library-snapshot";
import { legacyKeyResolver, reconcileOrderValue } from "./stable-item-key";

export type RendererRow = Record<string,string>;
export function rendererSnapshot(snapshot: LibrarySnapshot) {
  const projected = projectLibrarySnapshot(snapshot,snapshot.owner_id,snapshot.library_id);
  const resolveKey = legacyKeyResolver(snapshot.items, snapshot.library_id);
  const settings = snapshot.settings.map(setting=>({Key:setting.key,
    Value:reconcileOrderValue(setting.key,String(projected.settingValue(setting.key,setting.key.startsWith("popupCoverMode:")?"popupCoverMode":"general_getSetting")??""),resolveKey),
    __cdlGeneralValue:reconcileOrderValue(setting.key,String(projected.settingValue(setting.key)??""),resolveKey)}));
  const explicitKeys = new Set(settings.map(setting=>setting.Key));
  const preferences = new Map<string, typeof settings>();
  const rendererSettings = settings.filter(setting=>{
    const prefix = ["coverOverride:", "popupCoverMode:"].find(prefix=>setting.Key.startsWith(prefix));
    if (!prefix) return true;
    const nextKey = prefix + resolveKey(setting.Key.slice(prefix.length));
    if (nextKey === setting.Key) return true;
    if (!explicitKeys.has(nextKey)) preferences.set(nextKey,[...(preferences.get(nextKey)??[]),{...setting,Key:nextKey}]);
    // Keep recovery keys in the database, not as competing UI fallbacks.
    return false;
  });
  for (const candidates of preferences.values()) {
    if (candidates.every(entry=>entry.Value===candidates[0].Value && entry.__cdlGeneralValue===candidates[0].__cdlGeneralValue)) rendererSettings.push(candidates[0]);
  }
  const groups: Record<"book"|"movie"|"tv"|"game",RendererRow[]> = {book:[],movie:[],tv:[],game:[]};
  for (const entry of projected.items) groups[entry.mediaType].push({
    ...entry.row,__cdlItemId:entry.identity.itemId,__cdlLibraryId:entry.identity.libraryId,__cdlRevision:String(entry.identity.revision),__cdlMediaType:entry.mediaType,
  });
  return {
    books:groups.book,movies:groups.movie,shows:groups.tv,games:groups.game,
    episodes:projected.episodes.map(entry=>({...entry.row,__cdlEpisodeId:entry.identity.episodeId,__cdlShowId:entry.identity.showId,
      __cdlLibraryId:entry.identity.libraryId,__cdlRevision:entry.identity.progressRevision===null?"":String(entry.identity.progressRevision)})),
    settings:rendererSettings,
    observedAt:projected.observedAt,changeToken:projected.changeToken,
  };
}

// The four actual v13 parsers remain unchanged; identity travels alongside their
// output and survives the existing item spreads used by details/edit components.
export function retainDatabaseIdentity<T>(item:T,row:RendererRow):T {
  if (!item || !row.__cdlItemId) return item;
  const revision=Number(row.__cdlRevision);
  if (!Number.isSafeInteger(revision) || revision<1) throw new Error("Invalid renderer item revision");
  return {...item,...(typeof row.__cdlActivityId==="string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.__cdlActivityId)?{__cdlActivityId:row.__cdlActivityId}:{}),__cdlIdentity:{itemId:row.__cdlItemId,libraryId:row.__cdlLibraryId,revision,mediaType:row.__cdlMediaType}};
}
