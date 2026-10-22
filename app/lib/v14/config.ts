import {isV14RuntimeAllowed} from './hosted-preview';
export const V14_PROJECT = "xnitocbxdpikvfxssbvm";

export function getV14Config(env: NodeJS.ProcessEnv = process.env) {
  if (env.CDL_V14_TEST !== "true") throw new Error("v14 test mode is not enabled.");
  const url = env.CDL_V14_SUPABASE_URL;
  const key = env.CDL_V14_SUPABASE_PUBLISHABLE_KEY;
  if (url !== `https://${V14_PROJECT}.supabase.co` || !key?.startsWith("sb_publishable_")) {
    throw new Error("Configure only the isolated test project's publishable key and URL.");
  }
  const origin = env.CDL_V14_ORIGIN;
  if (!isV14RuntimeAllowed(env)) throw new Error("v14 runtime is not approved.");
  return { url, key, origin:origin! };
}

export function isV14Path(path: string) {
  return path === "/v14" || path.startsWith("/v14/");
}
