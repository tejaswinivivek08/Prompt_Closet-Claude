import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, tags, notes, item_ids, item_layers, gender } = body;

  const { data, error } = await supabase
    .from("saved_styles")
    .update({
      ...(name !== undefined && { name: name.trim() }),
      ...(tags !== undefined && { tags }),
      ...(notes !== undefined && { notes }),
      ...(item_ids !== undefined && { item_ids }),
      ...(item_layers !== undefined && { item_layers }),
      ...(gender !== undefined && { gender }),
    })
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ style: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("saved_styles")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
