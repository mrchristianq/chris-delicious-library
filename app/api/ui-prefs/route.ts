import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const UI_PREFS_KEY = "settings/ui-prefs.json";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

const s3 =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      })
    : null;

function missingR2() {
  return NextResponse.json({ ok: false, error: "R2 not configured." }, { status: 500 });
}

export async function GET() {
  if (!s3 || !bucket) return missingR2();
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: UI_PREFS_KEY }));
    const body = await res.Body?.transformToString("utf-8");
    const prefs = body ? JSON.parse(body) : {};
    return NextResponse.json({ ok: true, prefs });
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "NoSuchKey" || err.name === "NotFound")) {
      return NextResponse.json({ ok: true, prefs: {} });
    }
    const msg = err instanceof Error ? err.message : "Read failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!s3 || !bucket) return missingR2();
  try {
    const body = await req.json();
    const patch = body?.prefs;
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      return NextResponse.json({ ok: false, error: "prefs must be an object." }, { status: 400 });
    }

    // Read existing prefs and merge so we never clobber unrelated keys
    let existing: Record<string, unknown> = {};
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: UI_PREFS_KEY }));
      const text = await res.Body?.transformToString("utf-8");
      if (text) existing = JSON.parse(text);
    } catch {
      // NoSuchKey or parse error — start fresh
    }

    const merged = { ...existing, ...patch };
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: UI_PREFS_KEY,
        Body: JSON.stringify(merged),
        ContentType: "application/json",
        CacheControl: "no-store",
      })
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
