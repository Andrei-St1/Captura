/**
 * Run once to set an R2 lifecycle rule that aborts incomplete multipart uploads
 * after 1 day. Prevents orphaned partial uploads from consuming storage.
 *
 * Usage:
 *   npx tsx scripts/setup-r2-lifecycle.ts
 *
 * Requires the same R2_* env vars as the app (load from .env.local automatically).
 */

import { S3Client, PutBucketLifecycleConfigurationCommand, GetBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { resolve } from "path";

// Parse .env.local manually (no dotenv dependency needed)
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* file not found — rely on existing env */ }

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("Missing R2 env vars. Check .env.local");
  process.exit(1);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function main() {
  await r2.send(new PutBucketLifecycleConfigurationCommand({
    Bucket: R2_BUCKET_NAME,
    LifecycleConfiguration: {
      Rules: [
        {
          ID: "abort-incomplete-multipart",
          Status: "Enabled",
          Filter: { Prefix: "" },
          AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
        },
      ],
    },
  }));

  console.log("Lifecycle rule set. Verifying...");

  const result = await r2.send(new GetBucketLifecycleConfigurationCommand({ Bucket: R2_BUCKET_NAME }));
  console.log("Active rules:", JSON.stringify(result.Rules, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
