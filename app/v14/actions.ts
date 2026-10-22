"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getV14Config } from "../lib/v14/config";
import { createV14Client } from "../lib/v14/server";
import { ratingPatch, type V14Item, type V14RatingInput } from "../lib/v14/items";

async function requireLocalOrigin() {
  const config = getV14Config();
  if ((await headers()).get("origin") !== config.origin) throw new Error("Origin not allowed");
  return config;
}

export async function authenticate(_previous: string, data: FormData): Promise<string> {
  const config = await requireLocalOrigin();
  const email = String(data.get("email") || "").trim();
  const password = String(data.get("password") || "");
  const mode = data.get("mode");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length > 256) return "Enter a valid email and password.";
  if (mode !== "signup" && mode !== "signin") return "Choose sign in or create account.";
  if (password.length < (mode === "signup" ? 12 : 1)) return "Use at least 12 characters for your new password.";
  try {
    const client = await createV14Client();
    if (mode === "signup") {
      const { data: result, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${config.origin}/v14/auth/callback` } });
      if (error) return "Account creation could not complete. Check your details or try again later.";
      if (!result.session) return "Check your email for a confirmation link, then return here to sign in. No library data has been imported.";
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return "Sign-in failed. Check your email, password and email confirmation.";
    }
  } catch { return "The test sign-in service is unavailable. Please try again."; }
  redirect("/v14");
}

export async function signOut() {
  await requireLocalOrigin();
  const client = await createV14Client();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw new Error("Sign-out could not complete. Please retry.");
  redirect("/v14");
}

export async function saveRating(id: string, revision: number, requestId: string, data: V14RatingInput): Promise<V14Item> {
  await requireLocalOrigin();
  const client = await createV14Client();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new Error("Sign in again before saving.");
  const patch = ratingPatch(data);
  const { data: saved, error } = await client.rpc("cdl_v14_save_item", { p_id: id, p_revision: revision, p_request_id: requestId, p_patch: patch });
  if (error) throw new Error(error.message);
  // Independent fresh read after the transactional write. No Sheet request.
  const { data: confirmed, error: readError } = await client.rpc("cdl_v14_get_item", { p_id: id });
  if (readError || !confirmed || confirmed.revision !== saved.revision) throw new Error("Save not confirmed. Reload before retrying; another edit may have occurred.");
  for (const key of ["user_status", "personal_rating", "completed_on", "notes"] as const) {
    if (key in patch && confirmed[key] !== patch[key]) throw new Error("Save readback mismatch. Please reload.");
  }
  for (const [key, column] of [["tags","tags"],["hoursPlayed","Hours Played"],["yearPlayed","Year Played"]]) {
    if (key in patch && confirmed.user_fields[column] !== patch[key]) throw new Error("Save readback mismatch. Please reload.");
  }
  return confirmed as V14Item;
}
