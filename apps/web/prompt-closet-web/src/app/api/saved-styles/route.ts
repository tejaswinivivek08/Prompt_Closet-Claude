import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("saved_styles")
    .select(
      "id, name, tags, notes, thumbnail_url, item_ids, item_layers, gender, created_at",
    )
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ styles: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, tags, notes, item_ids, item_layers, gender } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("saved_styles")
    .insert({
      user_id: session.user.id,
      name: name.trim(),
      tags: tags ?? [],
      notes: notes ?? null,
      item_ids: item_ids ?? [],
      item_layers: item_layers ?? [],
      gender: gender ?? "female",
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ style: data });
}
