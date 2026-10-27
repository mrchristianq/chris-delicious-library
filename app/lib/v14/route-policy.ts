// Only these existing provider calls may enter an authenticated v14 wrapper.
export function blocksValidationWrite(path:string,method:string,readOnly:boolean,reviewOnly=false):boolean {
  if (!readOnly || method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  if(method==="POST" && path==="/v14/api/library/read")return false; // Authenticated read-only inventory comparison.
  if(reviewOnly&&method==="POST"&&(path==="/v14/api/sync-review"||path==="/v14/api/sync-review-batch"||path==="/v14/api/sync-execution"||path==="/v14/api/sync-manual"))return false;
  // Recommendation POSTs only read provider data; their wrapper still checks
  // authentication and origin. No mutations or server actions are admitted.
  return !(method === "POST" && (path === "/api/recommendations" || path === "/v14/api/provider/recommendations"));
}
// No legacy route handler is admitted directly, even if its method is GET.
export function v14ProviderTarget(path:string,method:string):string|null {
  const methods:Record<string,string>={
    "/api/media-search":"GET","/api/tv-episodes":"GET","/api/recommendations":"POST",
    "/api/cover-proxy":"GET","/api/sidebar-icon":"GET",
  };
  return Object.hasOwn(methods,path) && methods[path]===method ? `/v14/api/provider/${path.slice(5)}` : null;
}
export function isV14PublicAsset(path:string,method:string):boolean {
  return (method==="GET" || method==="HEAD") && !path.startsWith('/api/') && !path.startsWith('/v14/') &&
    !path.includes('..') && /\.(png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp3|m4a|mp4|webm)$/i.test(path);
}
