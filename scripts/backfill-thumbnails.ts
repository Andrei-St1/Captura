/**
 * Backfill ~480px WebP thumbnails for photos uploaded before thumbnails existed
 * (media rows with file_type = 'image' and thumbnail_url IS NULL).
 *
 * Safe to re-run: only rows still missing a thumbnail are processed, and the
 * thumbnail key is deterministic (albums/<albumId>/thumbs/<mediaId>.webp).
 *
 * Usage:
 *   npx tsx scripts/backfill-thumbnails.ts --dry-run   # count + list, no writes
 *   npx tsx scripts/backfill-thumbnails.ts             # do it
 *   npx tsx scripts/backfill-thumbnails.ts --limit 50  # first 50 only (smoke test)
 *   npx tsx scripts/backfill-thumbnails.ts --concurrency 8
 *
 * Requires R2_*, NEXT_PUBLIC_R2_PUBLIC_URL, NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local automatically).
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
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

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  NEXT_PUBLIC_R2_PUBLIC_URL,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (
  !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME ||
  !NEXT_PUBLIC_R2_PUBLIC_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY
) {
  console.error("Missing env vars. Check .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const argNum = (flag: string, fallback: number) => {
  const i = args.indexOf(flag);
  const n = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const LIMIT = argNum("--limit", Infinity);
const CONCURRENCY = argNum("--concurrency", 4);
const PAGE_SIZE = 100;
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type Row = { id: string; album_id: string; file_path: string | null; file_url: string };

async function readOriginal(row: Row): Promise<Buffer> {
  if (row.file_path) {
    const res = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: row.file_path }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  const res = await fetch(row.file_url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${row.file_url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processRow(row: Row): Promise<void> {
  const original = await readOriginal(row);
  const thumb = await sharp(original)
    .rotate()
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  const key = `albums/${row.album_id}/thumbs/${row.id}.webp`;
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: thumb,
    ContentType: "image/webp",
    ContentLength: thumb.length,
    CacheControl: IMMUTABLE_CACHE,
  }));

  const { error } = await supabase
    .from("media")
    .update({ thumbnail_url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}` })
    .eq("id", row.id)
    .is("thumbnail_url", null); // don't clobber a thumbnail written by a concurrent upload
  if (error) throw new Error(error.message);
}

async function main() {
  console.log(DRY_RUN ? "DRY RUN — no writes." : "Backfilling thumbnails…");

  let done = 0;
  let failed = 0;
  let seen = 0;
  let lastId: string | null = null;
  const failures: { id: string; error: string }[] = [];

  while (seen < LIMIT) {
    // Keyset pagination on id so rows that fail (and stay null) are not refetched forever.
    let q = supabase
      .from("media")
      .select("id, album_id, file_path, file_url")
      .eq("file_type", "image")
      .is("thumbnail_url", null)
      .order("id", { ascending: true })
      .limit(Math.min(PAGE_SIZE, LIMIT - seen));
    if (lastId) q = q.gt("id", lastId);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    const rows = data as Row[];
    lastId = rows[rows.length - 1].id;
    seen += rows.length;

    if (DRY_RUN) {
      rows.forEach((r) => console.log(`  would thumbnail ${r.id} (${r.file_path ?? r.file_url})`));
      continue;
    }

    // Simple worker pool over this page
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
        while (next < rows.length) {
          const row = rows[next++];
          try {
            await processRow(row);
            done++;
          } catch (err) {
            failed++;
            failures.push({ id: row.id, error: err instanceof Error ? err.message : String(err) });
          }
        }
      }),
    );
    console.log(`  processed ${seen} (ok ${done}, failed ${failed})`);
  }

  if (DRY_RUN) {
    console.log(`Would process ${seen} photo(s).`);
    return;
  }
  console.log(`Done. Thumbnails created: ${done}, failed: ${failed}.`);
  if (failures.length) {
    console.log("Failures:");
    failures.forEach((f) => console.log(`  ${f.id}: ${f.error}`));
    process.exitCode = 1;
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
