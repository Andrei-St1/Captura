import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const albumId = formData.get("albumId") as string | null;

    if (!file || !albumId) {
      return NextResponse.json({ error: "Missing file or albumId." }, { status: 400 });
    }

    const { data: album } = await supabase
      .from("albums")
      .select("id")
      .eq("id", albumId)
      .eq("owner_id", user.id)
      .single();

    if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `albums/${albumId}/thumbnail/${timestamp}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
      ContentLength: file.size,
    }));

    const thumbnailUrl = `${R2_PUBLIC_URL}/${filePath}`;

    const service = createServiceClient();
    await service.from("albums").update({ thumbnail_url: thumbnailUrl }).eq("id", albumId);

    return NextResponse.json({ success: true, thumbnailUrl });
  } catch (err) {
    console.error("Thumbnail upload error:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
