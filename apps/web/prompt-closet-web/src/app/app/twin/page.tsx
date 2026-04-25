import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TwinClient from "./TwinClient";

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

  const { data: avatars } = await supabase
    .from("user_avatars")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  return (
    <TwinClient
      initialItems={items || []}
      initialAvatar={avatars?.[0] || null}
      userId={session.user.id}
    />
  );
}
