export type PreferenceStorage = Pick<Storage,"getItem"|"setItem"|"removeItem">;
// Lazy access preserves SSR/private-mode error handling. No global monkey patch.
export const browserPreferenceStorage:PreferenceStorage={
  getItem:key=>typeof window==="undefined"?null:window.localStorage.getItem(key),
  setItem:(key,value)=>{if(typeof window!=="undefined")window.localStorage.setItem(key,value);},
  removeItem:key=>{if(typeof window!=="undefined")window.localStorage.removeItem(key);},
};
export function scopedPreferenceStorage(owner:string,library:string,storage:PreferenceStorage=browserPreferenceStorage):PreferenceStorage {
  const prefix=`cdl:v14:${encodeURIComponent(owner)}:${encodeURIComponent(library)}:`;
  return {getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key)};
}
