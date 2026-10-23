import type {TrackerChange} from './tracker-preview';

/** One unresolved item must not prevent unrelated, ready rows from applying. */
export function readyTrackerItemIds(rows:TrackerChange[],choices:Record<string,'app'|'tracker'>,skipped:Record<string,boolean>):string[]{
  const groups=new Map<string,TrackerChange[]>();
  for(const row of rows)groups.set(row.itemId,[...(groups.get(row.itemId)??[]),row]);
  return [...groups].filter(([id,changes])=>!skipped[id]&&trackerReviewBlockers(changes,choices).length===0).map(([id])=>id);
}

/** Explain existing review gates without authorizing or weakening them. */
export function trackerReviewBlockers(rows:TrackerChange[],choices:Record<string,'app'|'tracker'>):string[]{
  return rows.flatMap(row=>{
    if(row.identitySelection)return row.identitySelection.ready?[]:[row.identitySelection.reason||'Confirm whether these are the same item or separate editions, then choose the field values.'];
    if(row.plannedAction==='add-record'||row.plannedAction==='import-record')return [];
    if(row.plannedAction&&!row.planApproved)return [row.plannedAction==='provider-correction'?'Confirm the app’s record identity below. The tracker is missing or has different identification details. Selecting other values does not confirm this step.':'Confirm the record review below before applying.'];
    if(row.blockedField&&!row.repairApproved)return [`${row.label}: resolve the flagged Sheet value before applying.`];
    if(!row.plannedAction&&!row.blockedField&&['conflict','review'].includes(row.direction)&&!choices[row.id])return [`${row.label}: select the App or Google Sheet value to keep.`];
    return [];
  });
}
