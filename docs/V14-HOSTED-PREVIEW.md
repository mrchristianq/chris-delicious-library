# v14.0.67 — hosted preview preparation

## Isolated branch publication — October 22, 2026

Owner approved committing and pushing only `codex/v14-supabase`; `dev`, `main`, production and the original tracker stay unchanged. Verified separate CLI account `mrchristianq`, team `team_LLQnWpKTs91ldayTlJsmLWpK`, existing project `prj_teKGJ7tEwZ7BecFwicZjTbUUmHJz`. Branch-scoped secret creation was refused before publication because the remote branch did not exist; no secret was saved by that attempt.

Added `.vercelignore` to exclude private environment/key files, dependency caches and generated web/native build output. Actual CLI dry run decreased upload candidates from 4,263,644,931 to 347,441,374 bytes (about 92% smaller), with public artwork retained. This is source upload size, not a promise about billed deployment storage. No local files deleted. Version manifests and test badge aligned to 14.0.67.

Publication may trigger an ordinary Git Preview build. Until the branch-only runtime configuration is installed, v14 remains fail-closed; no production promotion or database migration is part of publication. Hosted acceptance is still pending.

## Approved live bucket installation — October22,2026

Owner explicitly approved private recovery bucket creation. Migration024 installed once, SHA256 `4e197226cc2b5a5b14ee50f80506d685446e1031ba576c80c335478b639a2acc`, pinned project and migration-history guards, no active runs/nightly, all-CDL-table fingerprint unchanged within installation transaction. Live readback:24 migrations,2340 active items,private bucket,24MB gzip limit,authenticated INSERT/SELECT only. Live owner INSERT/SELECT and foreign/anonymous SELECT denial tested inside a rolled-back transaction; no persistent test object or object bytes uploaded. This is live SQL RLS verification, NOT a live Storage API upload/download or hosted preview test. Credentials/config/redirects and deployment remain unchanged.

Fresh private pre-install backup: `/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-private-bucket-4kngsq`. schema.sql SHA256 `3929e2c31814f817a15931860320807ce411e4725d7afe620586e5fcf2303691`, data.sql SHA256 `ae64e6af985fb3dc0ec01a42bf205234c14a0ab102f8e6e69a55b4384573b326`. Original migration files/history untouched except024 insertion. No application code change/version bump in this operational turn. Statements below describing migration024 as prepared/not installed are historical; next gate is approved preview configuration and a real authenticated Storage API test.

Implemented and locally tested, NOT deployed or enabled. Existing v13 visuals and production remain unchanged. Production/native remain rejected intentionally.

## Safety model

- Keep the existing isolated Supabase project `xnitocbxdpikvfxssbvm` and exact new tracker `1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0`. No original Sheet access is added.
- Preview must have `VERCEL=1`, `VERCEL_ENV=preview`, `CDL_V14_TEST=true`, `CDL_V14_PREVIEW_ENABLED=true` and matching exact `CDL_V14_ORIGIN` / `CDL_V14_APPROVED_PREVIEW_ORIGIN`. That HTTPS origin must match the platform's `VERCEL_URL` or stable `VERCEL_BRANCH_URL`. No wildcard, arbitrary forwarded host or production deployment accepted.
- Supabase URL/publishable key remain pinned by existing config. Server/proxy cookies become Secure on HTTPS; callback redirects use only the approved origin. Add that exact `/v14/auth/callback` to Supabase redirects only after separate approval; do not replace existing localhost or v13 entries.
- `CDL_V14_GOOGLE_SERVICE_ACCOUNT_JSON`: server-only Secret, Preview environment/isolated branch only. Standard Google service-account JSON for the existing pinned account, validated RSA key/id. No new Google account/key/scope or recipient required by code. Do not put it in NEXT_PUBLIC variables, terminal arguments, logs, source, archive or chat. No local secret file fallback is accepted on hosted runs. The local private-file path is preserved unchanged.
- Manual writes still require the explicit existing acceptance/review flags and exact tracker target; nightly stays Off. Do not inherit or copy production environment wholesale.

## Private durable recovery artifacts

Prepared migration024 creates only `cdl-v14-recovery`, PRIVATE, bounded to24MB gzip objects. RLS insert/select requires both signed-in owner folder and a library returned by the existing owner-only library RPC. No anonymous access, overwrite or delete policy. No service-role secret/bypass, public URL or signed URL generation. Existing bucket collisions abort rather than silently adopting a public bucket.

Before dispatching any hosted sync, the server authenticates owner/library, uploads a unique append-only recovery file, downloads it with the user's authorization and verifies size/SHA256. Upload/readback failure stops BEFORE Google mutation. Receipt is saved through the existing audited setting mechanism. Local sync retains its current private disk backup.

Security basis: [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) and [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control). Existing Supabase storage quota must be monitored; no paid plan, automatic deletion, retention service or unlimited-capacity claim is introduced. If storage fills, sync must fail closed, not skip the backup. Hosted artifacts are not included in future database-only dumps: export them separately when preparing recovery bundles.

## Verification completed

-431 automated tests pass, including exact runtime allowlist, production rejection, account/key validation without secret disclosure, immutable upload and exact recovery readback failure cases.
-Production build, TypeScript, focused ESLint and Rust pass. These do not prove a real hosted deployment works.
-Migration024 rehearsed against an actual exported storage schema (including existing policies) plus restored CDL data in network-disabled PostgreSQL. Owner read/insert succeeds; other owner/anonymous/wrong library/invalid path fail; overwrite/deletion denied; items unchanged. Admin restoration is used solely inside the disposable container; no live grants changed. Evidence `/tmp/cdl-14066-storage-restore.log`.
-No live bucket creation, credential upload, auth redirect change, preview deployment, commit/push or production switch in this preparation pass.

## Next gated execution (not yet performed)

1. Obtain approval to install private bucket/policies in the isolated v14 project. Take a fresh guard-checked backup before installation; do not use a broad db push that could replay historical migrations. Verify live bucket remains private and owner/foreign/anonymous access via the Storage API. SQL rehearsal is not a real object-upload test.
2. Verify the EXISTING Vercel project/team. Do not relink/create another project. Obtain approval before transferring the existing Google secret to its isolated Preview configuration or expanding auth redirects. Do not expose secrets to unrelated branches. Select an exact stable, platform-provided preview alias; never grant wildcard Supabase redirects.
3. Prepare protected preview configuration (including provider keys scoped appropriately), ordinary manual-save flags, paused automatic TV metadata refresh and manual-only sync. Check Fluid Compute/function-duration configuration before hosted sync tests; local timing is not evidence of hosted limits. No scheduler.
4. With explicit preview-deployment approval, deploy the source without promoting production or pushing branches unless separately authorized. Verify sign-in, initial reads, normal mutation readback, private object upload/download, manual sync confirmation and safe resume. Use an owner-approved reversible test. Leave v13 untouched.
5. Only after real hosted acceptance discuss production enablement; this66 gate intentionally does not authorize production.

Rollback: remove/disable preview enablement and stop using that deployment, retaining app data and private backups. Do not delete the Supabase project, existing bucket objects, credential or original Sheet as a rollback shortcut. Local65 recovery/checkpoint remains at `v14-release-14065-qTbKTc`; newer data must be preserved. See V14-RELEASE-READINESS.md for local fallback.
