"use server";

import { headers } from "next/headers";
import { createV14Client } from "../../../lib/v14/server";
import { localPasswordChangeAllowed, validateNewPassword, passwordChangeError } from "../../../lib/v14/password-change";

export async function changeOwnPassword(_previous: string, form: FormData): Promise<string> {
  if (!localPasswordChangeAllowed() || (await headers()).get("origin") !== "http://localhost:3014")
    return "Password changes are available only in the signed-in local test app.";
  const password = form.get("password");
  const invalid = validateNewPassword(password, form.get("confirmation"));
  if (invalid) return invalid;
  try {
    const client = await createV14Client();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user || user.id !== "baf0dab8-9904-48f2-a00f-30773bfc6ae1")
      return "Your existing library-owner session is required. No password was changed.";
    const { data, error } = await client.auth.updateUser({ password: password as string });
    if (error) return passwordChangeError(error);
    if (data.user?.id !== user.id) return "Supabase returned an unexpected account. Password change is not confirmed.";
    return "Password updated. You can now sign in to the hosted preview with your new password.";
  } catch {
    return "The password change could not be confirmed. Please try again later.";
  }
}
