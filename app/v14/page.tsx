import { notFound } from "next/navigation";
import { createV14Client } from "../lib/v14/server";
import { SignIn } from "./SignIn";
import { signOut } from "./actions";
import { Renderer } from "./Renderer";
import { rendererIdentity } from "../lib/v14/renderer-entry";
import { readV14LibraryForVerifiedOwner } from "../lib/v14/read-library-server";
import type { InitialLibraryRead } from "../lib/v14/renderer-backend";
import "./v14.css";
import { isApprovedV14Production } from "../lib/v14/hosted-preview";

export const dynamic = "force-dynamic";

export default async function V14Page() {
  if (process.env.CDL_V14_TEST !== "true") notFound();
  const client = await createV14Client();
  const { data: { user }, error: authError } = await client.auth.getUser();
  const status = user ? await client.rpc("cdl_v14_my_libraries") : null;
  const libraries = status?.data as Array<{ id: string; name: string; item_count: number }> | null;
  const identity = user && !authError && !status?.error ? rendererIdentity(user.id, libraries) : null;
  const validationReadOnly = process.env.CDL_V14_VALIDATION_READ_ONLY === "true";
  const suppressAutomaticRefresh = process.env.CDL_V14_MANUAL_WRITES_ONLY === "true";
  if (identity) {
    // Start before the large legacy interface downloads/hydrates. React streams
    // this request-scoped promise; do not await it or cache it across requests.
    const initialRead:Promise<InitialLibraryRead>=readV14LibraryForVerifiedOwner(client, identity.ownerId, identity.libraryId)
      .then(snapshot=>({snapshot}))
      .catch(()=>({error:"Fresh library read failed. Please refresh to retry."}));
    return <Renderer key={`${identity.key}:${validationReadOnly}:${suppressAutomaticRefresh}`} ownerId={identity.ownerId} libraryId={identity.libraryId} validationReadOnly={validationReadOnly} suppressAutomaticRefresh={suppressAutomaticRefresh} initialRead={initialRead} />;
  }
  return <main className="v14-root">
    <div className={`v14-panel ${libraries?.length ? "v14-wide" : ""}`}>
<span className="v14-badge">{isApprovedV14Production() ? "YOUR LIBRARY" : "PRIVATE TEST"} · 14.0.87</span>
      <h1>Chris’ Delicious Library</h1>
      <p className="v14-intro">{isApprovedV14Production() ? "Sign in to your collection." : "Your next chapter, safely separated."}</p>
      <div className="v14-safety">{isApprovedV14Production() ? "Saved to Supabase · Manual tracker sync · Original Google Sheet protected" : "Original app unchanged · Original Google Sheet untouched · Sync off"}</div>
      {user ? <section>
        <h2>Signed in</h2><p>{user.email}</p>
        {status?.error ? <p role="alert">Library connection could not be verified. No data has been changed.</p> : libraries?.length ? <ul>{libraries.map(library => <li key={library.id}>{library.name}: {library.item_count} items</li>)}</ul> : <p>Your account is ready. The cleaned library has not been assigned or imported yet. Signing in alone does not start the import.</p>}
        {libraries && libraries.length > 1 ? <p role="alert">Multiple libraries found. Library selection must be resolved before opening the app; none has been selected automatically.</p> : null}
        <form action={signOut}><button>Sign out</button></form>
      </section> : <SignIn />}
    </div>
  </main>;
}
