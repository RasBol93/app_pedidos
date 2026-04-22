import { randomBytes } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} no esta configurada.`);
  }

  return value;
}

function getExtension(filename: string) {
  const parts = filename.trim().split(".");

  if (parts.length < 2) {
    return "";
  }

  const extension = parts.pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  return extension ? `.${extension}` : "";
}

function buildObjectKey(filename: string) {
  const random = randomBytes(6).toString("hex");
  const extension = getExtension(filename);
  return `payment_proofs/${Date.now()}_${random}${extension}`;
}

function buildClient() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    forcePathStyle: true
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debes enviar un archivo." }, { status: 400 });
    }

    const bucket = requireEnv("R2_BUCKET_NAME");
    const publicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
    const objectKey = buildObjectKey(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const client = buildClient();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type || "application/octet-stream"
      })
    );

    return NextResponse.json({
      success: true,
      file_reference: `${publicBaseUrl}/${objectKey}`,
      original_name: file.name,
      object_key: objectKey
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos subir el comprobante a R2.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
