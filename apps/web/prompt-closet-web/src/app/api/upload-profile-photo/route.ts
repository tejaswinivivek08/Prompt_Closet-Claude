import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const uint8Array = new Uint8Array(bytes);
  const path = `${session.user.id}/avatar.jpg`;

  const { error } = await supabase.storage
    .from("wardrobe-items")
    .upload(path, uint8Array, { contentType: "image/jpeg", upsert: true });

  if (error) {
    console.error("[upload-profile-photo] storage error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("wardrobe-items").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
