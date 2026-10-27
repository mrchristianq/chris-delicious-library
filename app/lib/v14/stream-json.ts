/** Stream large, already-validated library responses instead of buffering a
 * single function response. The client still waits for complete JSON before
 * validating/rendering anything. This does not change freshness or caching. */
export function streamLibraryJson(value:unknown,headers:HeadersInit,status=200) {
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let offset=0;
  return new Response(new ReadableStream<Uint8Array>({
    pull(controller){
      if(offset>=bytes.length){controller.close();return;}
      const end=Math.min(offset+64*1024,bytes.length);
      controller.enqueue(bytes.subarray(offset,end));offset=end;
    },
  }),{status,headers:{...Object.fromEntries(new Headers(headers)), 'Content-Type':'application/json; charset=utf-8'}});
}
