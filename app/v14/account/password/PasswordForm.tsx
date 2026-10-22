"use client";

import { useActionState } from "react";
import { changeOwnPassword } from "./actions";

export function PasswordForm() {
  const [message, action, pending] = useActionState(changeOwnPassword, "");
  const complete = message.startsWith("Password updated.");
  return <form action={action} className="v14-form">
    {!complete ? <>
      <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required disabled={pending} /></label>
      <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={256} required disabled={pending} /></label>
      <button className="v14-primary" disabled={pending}>{pending ? "Updating…" : "Update my password"}</button>
    </> : null}
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
