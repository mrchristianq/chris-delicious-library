import { notFound } from "next/navigation";
import { createV14Client } from "../../../lib/v14/server";
import { localPasswordChangeAllowed } from "../../../lib/v14/password-change";
import { PasswordForm } from "./PasswordForm";
import "../../v14.css";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  if (!localPasswordChangeAllowed()) notFound();
  const client = await createV14Client();
  const { data: { user }, error } = await client.auth.getUser();
  const owner = !error && user?.id === "baf0dab8-9904-48f2-a00f-30773bfc6ae1";
  return <main className="v14-root"><div className="v14-panel">
    <h1>Change your test-library password</h1>
    {owner ? <>
      <p>Signed in as {user.email}</p>
      <p>Enter your new password yourself. This changes only your app login—not GitHub, the Supabase dashboard, or your library data.</p>
      <PasswordForm />
    </> : <p>Your existing signed-in library-owner session is required. No changes have been made.</p>}
    <a href="/v14">Back to your local library</a>
  </div></main>;
}
