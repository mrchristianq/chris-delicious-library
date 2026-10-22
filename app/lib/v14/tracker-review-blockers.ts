import type {TrackerChange} from './tracker-preview';

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
