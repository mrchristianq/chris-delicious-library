"use client";

import { useActionState, useState } from "react";
import { authenticate } from "./actions";

export function SignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, action, pending] = useActionState(authenticate, "");
  return <form action={action} className="v14-form">
    <h2>{mode === "signin" ? "Sign in to your test library" : "Create your test account"}</h2>
    <p>This is an app login—not your Supabase dashboard login. Only a separately assigned library is accessible after sign-in.</p>
    <input type="hidden" name="mode" value={mode} />
    <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} disabled={pending} /></label>
    <label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 12 : 1} maxLength={256} required disabled={pending} /></label>
    <button className="v14-primary" disabled={pending}>{pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create test account"}</button>
    <button type="button" disabled={pending} onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "First time? Create a test account" : "Already registered? Sign in"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
