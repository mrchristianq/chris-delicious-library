import { createV14Client } from "./server";
import { saveSetting, saveSettingWithReadback, type SettingValue } from "./save-setting";
import { readBoundedSnapshot } from "./bounded-snapshot";

export function saveV14Setting(libraryId:string,key:string,revision:number|null,requestId:string,value:SettingValue,targeted?:false):Promise<Awaited<ReturnType<typeof saveSetting>>>;
export function saveV14Setting(libraryId:string,key:string,revision:number|null,requestId:string,value:SettingValue,targeted:boolean):Promise<Awaited<ReturnType<typeof saveSettingWithReadback>>>;
export async function saveV14Setting(libraryId: string, key: string, revision: number | null, requestId: string, value: SettingValue, targeted = false) {
  const client = await createV14Client();
  const readback = targeted ? async (id:string,keys:string[],episodes:string[]) => {
    const {data,error}=await client.rpc("cdl_v14_save_readback",{p_library_id:id,p_setting_keys:keys,p_episode_ids:episodes});
    if(error?.code==="PGRST202")return null; // Old database: verified full read during rollout.
    if(error)throw new Error("Independent save readback failed");
    return data;
  } : undefined;
  return (targeted ? saveSettingWithReadback : saveSetting)({
    readback,
    async authenticatedOwner() {
      const { data, error } = await client.auth.getUser();
      return error ? null : data.user?.id ?? null;
    },
    async write(id, settingKey, expectedRevision, request, settingValue) {
      const { data, error } = await client.rpc("cdl_v14_save_setting", { p_library_id: id, p_key: settingKey, p_revision: expectedRevision, p_request_id: request, p_value: { value: settingValue } });
      if (error) throw new Error("Setting save not confirmed. Keep the request ID for a safe retry.");
      return data;
    },
    async snapshot(id) {
      return readBoundedSnapshot((name, args) => client.rpc(name, args), id);
    },
  }, libraryId, key, revision, requestId, value);
}
