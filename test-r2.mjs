import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: "https://3ecfd33136759f9c9aecd118a054b743.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "c60221683898b9b3c3ef2bc8989ca2a3",
    secretAccessKey: "16f2910e81277a03bc1fcbb7e7078e3dae24d3cedd5e9ed9be6af0e61e49a6d8",
  },
  forcePathStyle: true,
});

const bucket = "comprobantes-pagos";
const key = `debug/test-${Date.now()}.txt`;

try {
  const result = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: "hello from local node test",
      ContentType: "text/plain",
    })
  );

  console.log("UPLOAD_OK");
  console.log(result);
  console.log(
    "PUBLIC_URL:",
    `https://pub-092453b954344e13a479d92a81ac856c.r2.dev/${key}`
  );
} catch (err) {
  console.error("UPLOAD_FAILED");
  console.error(err);
}
