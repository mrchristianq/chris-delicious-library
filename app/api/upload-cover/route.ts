import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const publicBaseUrl = process.env.R2_PUBLIC_URL;

const s3 =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

function sanitizePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extFromFile(file: File) {
  const filename = file.name || "";
  const fromName = filename.includes(".") ? filename.split(".").pop() || "" : "";
  const lower = fromName.toLowerCase();
  if (lower === "jpg" || lower === "jpeg") return "jpg";
  if (lower === "png") return "png";
  if (lower === "webp") return "webp";

  const type = (file.type || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

export async function POST(req: NextRequest) {
  try {
    if (!s3 || !bucket || !publicBaseUrl) {
      return NextResponse.json(
        { error: "R2 is not configured. Missing one or more R2_* environment variables." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const mediaType = String(formData.get("mediaType") || "media");
    const itemKey = String(formData.get("itemKey") || "item");
    const title = String(formData.get("title") || "cover");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (!buffer.length) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    const ext = extFromFile(file);
    const safeType = sanitizePart(mediaType) || "media";
    const safeKey = sanitizePart(itemKey) || sanitizePart(title) || "cover";
    const timestamp = Date.now();
    const objectKey = `overrides/${safeType}/${safeKey}-${timestamp}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type || "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const base = publicBaseUrl.replace(/\/+$/, "");
    const url = `${base}/${objectKey}`;

    return NextResponse.json({
      ok: true,
      key: objectKey,
      url,
    });
  } catch (error: any) {
    console.error("upload-cover error", error);
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 });
  }
}
