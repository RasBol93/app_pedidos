import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} no esta configurada.`);
  }

  return value;
}

function buildR2Client() {
  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

function buildObjectKey(originalName: string) {
  const safeName = originalName.trim().toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
  const extension = safeName.includes(".") ? safeName.split(".").pop()?.slice(0, 12) : "";
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const finalExtension = extension ? `.${extension}` : "";

  return `payment_proofs/${Date.now()}_${suffix}${finalExtension}`;
}

function buildPublicFileUrl(objectKey: string) {
  const publicBaseUrl = getRequiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  return `${publicBaseUrl}/${objectKey}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debes enviar un archivo." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const objectKey = buildObjectKey(file.name);
    const bucketName = getRequiredEnv("R2_BUCKET_NAME");
    const client = buildR2Client();

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type || "application/octet-stream"
      })
    );

    return NextResponse.json({
      success: true,
      file_reference: buildPublicFileUrl(objectKey),
      original_name: file.name,
      object_key: objectKey
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos subir el comprobante a storage.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
