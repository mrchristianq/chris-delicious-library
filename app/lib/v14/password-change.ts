import { isV14RuntimeAllowed } from "./hosted-preview";

// Temporary local recovery aid: never available on hosted or native runtimes.
export function localPasswordChangeAllowed(env: NodeJS.ProcessEnv = process.env) {
  return !env.VERCEL && env.CDL_V14_ORIGIN === "http://localhost:3014" && isV14RuntimeAllowed(env);
}

export function validateNewPassword(password: unknown, confirmation: unknown): string | null {
  if (typeof password !== "string" || password.length < 12 || password.length > 256)
    return "Use a new password between 12 and 256 characters.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}

export function passwordChangeError(error: { code?: string; status?: number; name?: string }): string {
  const messages: Record<string, string> = {
    reauthentication_needed: "Supabase requires an emailed verification code before changing this password. Your password has not been changed.",
    reauthentication_not_valid: "The verification code is missing, expired, or invalid. Your password has not been changed.",
    same_password: "Supabase says this is already your current password. Try it on the hosted preview with mrchristianq@gmail.com, or choose a different new password.",
    weak_password: "Supabase rejected the new password under its password-security policy. Choose a stronger, unique password.",
    session_not_found: "Your local sign-in session is no longer valid. Email account recovery is required.",
    session_expired: "Your local sign-in session has expired. Email account recovery is required.",
    over_request_rate_limit: "Supabase is rate-limiting requests. Wait before trying again.",
    over_email_send_rate_limit: "Supabase is rate-limiting verification emails. Wait before requesting another.",
  };
  // Never expose the provider message, submitted password, tokens, or response body.
  const code = error.code && /^[a-z_]{1,80}$/.test(error.code) ? error.code : "unclassified";
  const status = Number.isInteger(error.status) && error.status! >= 100 && error.status! <= 599 ? `; HTTP ${error.status}` : "";
  return `${messages[code] || "Supabase did not confirm the password change."} (Code: ${code}${status})`;
}
