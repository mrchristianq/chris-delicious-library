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

function sanitizeObjectKey(value: string) {
  return value
    .split("/")
    .map((segment) => sanitizePart(segment))
    .filter(Boolean)
    .join("/");
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
    const sourceUrl = String(formData.get("sourceUrl") || "");
    const mediaType = String(formData.get("mediaType") || "media");
    const itemKey = String(formData.get("itemKey") || "item");
    const title = String(formData.get("title") || "cover");
    const requestedObjectKey = String(formData.get("objectKey") || "");
    let buffer: Buffer | null = null;
    let contentType = "image/jpeg";
    let ext = "jpg";

    if (file && file instanceof File) {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      if (!buffer.length) {
        return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
      }
      ext = extFromFile(file);
      contentType = file.type || contentType;
    } else if (sourceUrl) {
      const response = await fetch(sourceUrl, { cache: "no-store" });
      if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch source URL (${response.status})` }, { status: 400 });
      }
      const bytes = await response.arrayBuffer();
      buffer = Buffer.from(bytes);
      if (!buffer.length) {
        return NextResponse.json({ error: "Source URL returned empty image" }, { status: 400 });
      }
      const responseType = (response.headers.get("content-type") || "").toLowerCase();
      if (responseType.includes("png")) {
        ext = "png";
        contentType = "image/png";
      } else if (responseType.includes("webp")) {
        ext = "webp";
        contentType = "image/webp";
      } else {
        ext = "jpg";
        contentType = responseType || contentType;
      }
    } else {
      return NextResponse.json({ error: "No file or source URL received" }, { status: 400 });
    }

    const safeType = sanitizePart(mediaType) || "media";
    const safeKey = sanitizePart(itemKey) || sanitizePart(title) || "cover";
    const timestamp = Date.now();
    const sanitizedRequestedObjectKey = sanitizeObjectKey(requestedObjectKey);
    const objectKey = sanitizedRequestedObjectKey || `overrides/${safeType}/${safeKey}-${timestamp}.${ext}`;
    const usesFixedObjectKey = Boolean(sanitizedRequestedObjectKey);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
        CacheControl: usesFixedObjectKey
          ? "public, max-age=60, must-revalidate"
          : "public, max-age=31536000, immutable",
      })
    );

    const base = publicBaseUrl.replace(/\/+$/, "");
    const url = `${base}/${objectKey}`;

    return NextResponse.json({
      ok: true,
      key: objectKey,
      url,
    });
  } catch (error: unknown) {
    console.error("upload-cover error", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
