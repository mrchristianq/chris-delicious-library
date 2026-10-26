import type {TrackerChange} from './tracker-preview';

/** A whole-item choice includes the already-linked app identity, never an ambiguous merge. */
export function trackerItemChoiceRows(rows:TrackerChange[],side:'app'|'tracker'):TrackerChange[]{
  return rows.filter(row=>!!row.decisionToken&&row.resolutionAllowed===true&&!row.identitySelection&&!row.blockedField&&(
    !row.plannedAction&&['conflict','import','export'].includes(row.direction)||
    side==='app'&&row.plannedAction==='provider-correction'
  ));
}

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
    if(row.plannedAction&&!row.planApproved)return [row.plannedAction==='provider-correction'?'Confirm the app’s record identity: choose Keep App for this whole item, or review its identification under Compare.':'Confirm the record review below before applying.'];
    if(row.blockedField&&!row.repairApproved)return [`${row.label}: resolve the flagged Sheet value before applying.`];
    if(!row.plannedAction&&!row.blockedField&&['conflict','review'].includes(row.direction)&&!choices[row.id])return [`${row.label}: select the App or Google Sheet value to keep.`];
    return [];
  });
}
