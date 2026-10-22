import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getV14Config } from "./config";
import {boundedFreshFetch} from "./bounded-fetch";

export async function createV14Client(bounded=false) {
  const { url, key, origin } = getV14Config();
  const jar = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { name: "cdl-v14-test-auth", httpOnly: true, sameSite: "lax", path: "/", secure: origin.startsWith('https:') },
    global: { fetch: (input, init) => bounded?boundedFreshFetch(input,init):fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        // Server Components cannot set cookies; proxy refreshes them first.
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* read-only render */ }
      },
    },
  });
}
