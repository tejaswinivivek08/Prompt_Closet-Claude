import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TwinClient from "./TwinClient";

export const dynamic = "force-dynamic";

export default async function TwinPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth");

  const { data: items } = await supabase
    .from("wardrobe_items")
    .select("id, image_url, category, suggested_name")
    .eq("user_id", session.user.id)
    .eq("is_active", true);

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "avatar_url, avatar_glb_url, avatar_params, bust_cm, waist_cm, hip_cm, body_type, hair_style, hair_color, clothing_size",
    )
    .eq("id", session.user.id)
    .single();

  return (
    <TwinClient
      initialItems={items || []}
      initialProfile={profiles || null}
      userId={session.user.id}
    />
  );
}
