export type ActivityContext = {id:string; role:'user'|'metadata'|'artwork'};
export function parseActivityContext(id:string|null,role:string|null):ActivityContext|undefined {
  if(id===null&&role===null)return undefined;
  if(!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id) || !['user','metadata','artwork'].includes(role??''))throw new Error('Invalid activity context');
  return {id,role:role as ActivityContext['role']};
}
