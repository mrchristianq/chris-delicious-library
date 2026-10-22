import { createV14Client } from "./server";
import { saveSetting, type SettingValue } from "./save-setting";
import { readBoundedSnapshot } from "./bounded-snapshot";

export async function saveV14Setting(libraryId: string, key: string, revision: number | null, requestId: string, value: SettingValue) {
  const client = await createV14Client();
  return saveSetting({
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
