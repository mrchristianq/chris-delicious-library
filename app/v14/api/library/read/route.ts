import { streamLibraryJson } from "../../../../lib/v14/stream-json";
import { getV14Config } from '../../../../lib/v14/config';
import { readIncrementalLibrary } from '../../../../lib/v14/incremental-read-server';
import { validateRecordIndex } from '../../../../lib/v14/incremental-snapshot';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store, max-age=0',Pragma:'no-cache',Vary:'Cookie, Origin'};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
export async function POST(request:Request) {
  try {
    const {origin}=getV14Config();
    if(request.headers.get('origin')!==origin)return reply({error:'Origin not allowed'},403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
    const max=2*1024*1024;
    const reader=request.body?.getReader();
    if(!reader)return reply({error:'Missing read request'},400);
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();return reply({error:'Read inventory too large'},413);}chunks.push(value);}
    let input;
    try{input=JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));validateRecordIndex(input.records);}
    catch{return reply({error:'Invalid read inventory'},400);}
    if(Object.keys(input).some(key=>!['libraryId','changeToken','records'].includes(key)) || !/^[a-f0-9-]{36}$/i.test(input.libraryId) || !/^[a-f0-9]{32}$/i.test(input.changeToken))return reply({error:'Invalid read identity'},400);
    return streamLibraryJson(await readIncrementalLibrary(input.libraryId,input.records,input.changeToken),headers);
  }catch(error){return reply({error:'Fresh library read failed'},(error as Error).message==='Authentication required'?401:503);}
}
