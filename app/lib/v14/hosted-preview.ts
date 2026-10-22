/** Explicit preview allowlist only; never derived from forwarded request headers. */
export function isApprovedV14Preview(env:NodeJS.ProcessEnv=process.env):boolean{
  if(env.VERCEL!=='1'||env.VERCEL_ENV!=='preview'||env.CDL_V14_PREVIEW_ENABLED!=='true'||env.CDL_V14_TEST!=='true'||env.NEXT_PUBLIC_NATIVE_APP==='true')return false;
  // An explicitly approved platform-provided branch alias can remain stable
  // across previews. Never accept wildcard origins or arbitrary Host headers.
  return [env.VERCEL_URL,env.VERCEL_BRANCH_URL].some(host=>!!host&&/^[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(host)&&env.CDL_V14_ORIGIN===`https://${host}`)&&env.CDL_V14_APPROVED_PREVIEW_ORIGIN===env.CDL_V14_ORIGIN;
}
/** Production is a separate explicit opt-in, pinned to the existing project. */
export function isApprovedV14Production(env:NodeJS.ProcessEnv=process.env):boolean{
  const origin='https://chris-delicious-library.vercel.app';
  return env.VERCEL==='1'&&env.VERCEL_ENV==='production'&&
    env.VERCEL_PROJECT_ID==='prj_teKGJ7tEwZ7BecFwicZjTbUUmHJz'&&
    env.VERCEL_PROJECT_PRODUCTION_URL==='chris-delicious-library.vercel.app'&&
    env.CDL_V14_PRODUCTION_ENABLED==='true'&&env.CDL_V14_TEST==='true'&&
    env.NEXT_PUBLIC_NATIVE_APP!=='true'&&env.CDL_V14_ORIGIN===origin&&
    env.CDL_V14_APPROVED_PRODUCTION_ORIGIN===origin;
}
export function isApprovedV14Hosted(env:NodeJS.ProcessEnv=process.env):boolean{
  return isApprovedV14Preview(env)||isApprovedV14Production(env);
}
export function isV14RuntimeAllowed(env:NodeJS.ProcessEnv=process.env):boolean{
  if(env.NEXT_PUBLIC_NATIVE_APP==='true'||env.CDL_V14_TEST!=='true')return false;
  return env.VERCEL?isApprovedV14Hosted(env):env.CDL_V14_ORIGIN==='http://localhost:3014';
}
