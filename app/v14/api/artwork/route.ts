import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import {
  createArtworkObjectKey,
  createIconObjectKey,
  isArtworkUuid,
  MAX_ARTWORK_BYTES,
  MAX_MULTIPART_BYTES,
  readLimitedStream,
  validateArtworkImage,
  validateArtworkInput,
  validateArtworkPublicBaseUrl,
  validateArtworkSourceUrl,
} from "../../../lib/v14/artwork-upload";
import { getV14Config } from "../../../lib/v14/config";
import { readV14Library } from "../../../lib/v14/read-library-server";
import { createV14Client } from "../../../lib/v14/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let origin: string;
  try {
    origin = getV14Config().origin;
  } catch {
    return NextResponse.json({ ok: false, error: "v14 artwork uploads are unavailable." }, { status: 403 });
  }
  if (request.headers.get("origin") !== origin) {
    return NextResponse.json({ ok: false, error: "Origin not allowed." }, { status: 403 });
  }

  // Authenticate before reading or parsing the request body.
  try {
    const client = await createV14Client();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return NextResponse.json({ ok: false, error: "R2 is not configured." }, { status: 500 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return NextResponse.json({ ok: false, error: "Expected multipart form data." }, { status: 400 });
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!/^\d+$/.test(declaredLength) || !Number.isSafeInteger(parsedLength)) {
      return NextResponse.json({ ok: false, error: "Invalid request size." }, { status: 400 });
    }
    if (parsedLength > MAX_MULTIPART_BYTES) {
      return NextResponse.json({ ok: false, error: "Artwork request exceeds the 11 MB limit." }, { status: 413 });
    }
  }

  let form: FormData;
  try {
    if (!request.body) return NextResponse.json({ ok: false, error: "Empty request body." }, { status: 400 });
    const body = await readLimitedStream(request.body, MAX_MULTIPART_BYTES);
    const boundedBody = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(body); controller.close(); } });
    form = await new Response(boundedBody, { headers: { "content-type": contentType } }).formData();
  } catch (error) {
    const tooLarge = error instanceof Error && error.message.startsWith("Stream exceeds");
    return NextResponse.json({ ok: false, error: tooLarge ? "Artwork request exceeds the 11 MB limit." : "Invalid multipart upload." }, { status: tooLarge ? 413 : 400 });
  }
  const libraryId = String(form.get("libraryId") ?? "");
  const rawItemId = form.get("itemId");
  const itemId = typeof rawItemId === "string" ? rawItemId : "";
  const rawScope = form.get("scope");
  const scope = rawScope === null ? "item" : rawScope;
  const fileValue = form.get("file");
  const sourceValue = form.get("sourceUrl");
  if (!isArtworkUuid(libraryId) || (scope !== "item" && scope !== "icon")) {
    return NextResponse.json({ ok: false, error: "A valid library identity and upload scope are required." }, { status: 400 });
  }
  if (scope === "item" && !isArtworkUuid(itemId)) {
    return NextResponse.json({ ok: false, error: "A valid item identity is required." }, { status: 400 });
  }
  let inputType: "file" | "sourceUrl";
  try {
    inputType = validateArtworkInput(form.has("file"), form.has("sourceUrl"));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Invalid artwork input." }, { status: 400 });
  }
  if (form.has("objectKey")) {
    return NextResponse.json({ ok: false, error: "Caller supplied object keys are not supported." }, { status: 400 });
  }
  if (inputType === "file" && !(fileValue instanceof File)) {
    return NextResponse.json({ ok: false, error: "Upload a JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (inputType === "sourceUrl" && typeof sourceValue !== "string") {
    return NextResponse.json({ ok: false, error: "A source URL is required." }, { status: 400 });
  }

  let snapshot;
  try {
    snapshot = await readV14Library(libraryId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Library access failed.";
    const status = message.includes("Authentication required") ? 401 : message.includes("Invalid library identity") ? 400 : 403;
    return NextResponse.json({ ok: false, error: status === 401 ? "Authentication required." : "Library access denied." }, { status });
  }
  if (scope === "item" && !snapshot.items.some(item => item.id === itemId && item.library_id === libraryId)) {
    return NextResponse.json({ ok: false, error: "Item not found in this library." }, { status: 404 });
  }

  try {
    const base = new URL(validateArtworkPublicBaseUrl(publicBaseUrl));
    let bytes: Uint8Array;
    let image: ReturnType<typeof validateArtworkImage>;
    if (inputType === "file") {
      const file = fileValue as File;
      if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_ARTWORK_BYTES) {
        throw new Error(file.size > MAX_ARTWORK_BYTES ? "Image exceeds the 10 MB limit" : "Uploaded file is empty or has an invalid size");
      }
      bytes = new Uint8Array(await file.arrayBuffer());
      image = validateArtworkImage(file.size, file.type, bytes);
    } else {
      const safeSourceUrl = validateArtworkSourceUrl(sourceValue as string, publicBaseUrl);
      const response = await fetch(safeSourceUrl, { cache: "no-store", redirect: "error" });
      if (!response.ok || !response.body) throw new Error("Artwork source did not return an image");
      const declaredSourceLength = response.headers.get("content-length");
      if (declaredSourceLength && Number(declaredSourceLength) > MAX_ARTWORK_BYTES) {
        throw new Error("Image exceeds the 10 MB limit");
      }
      bytes = await readLimitedStream(response.body, MAX_ARTWORK_BYTES);
      const sourceType = (response.headers.get("content-type") || "").split(";", 1)[0].trim();
      image = validateArtworkImage(bytes.byteLength, sourceType, bytes);
    }
    const uploadId = crypto.randomUUID();
    const objectKey = scope === "icon"
      ? createIconObjectKey(libraryId, uploadId, image.extension)
      : createArtworkObjectKey(libraryId, itemId, uploadId, image.extension);
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: bytes,
      ContentType: image.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }));

    const url = `${base.toString().replace(/\/+$/, "")}/${objectKey}`;
    return NextResponse.json({ ok: true, key: objectKey, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artwork upload failed.";
    const status = /Image exceeds|Stream exceeds/.test(message)
      ? 413
      : /Uploaded|Upload must|Unsupported artwork|Invalid artwork|Artwork source|exactly one/.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: status === 400 ? message : "Artwork upload failed." }, { status });
  }
}
