/** A deadline bounds each request, not the whole resumable run. Never retries
 * a mutation: an unknown acknowledgement must use its audited command ID. */
export function boundedFreshFetch(input:Parameters<typeof fetch>[0],init:RequestInit|undefined,send:typeof fetch=fetch){
 const deadline=AbortSignal.timeout(20000);
 const signal=init?.signal?AbortSignal.any([init.signal,deadline]):deadline;
 return send(input,{...init,cache:"no-store",signal});
}
