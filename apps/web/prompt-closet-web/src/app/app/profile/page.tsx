import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const { count: itemCount } = await supabase
    .from("wardrobe_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("is_active", true);

  const { count: outfitCount } = await supabase
    .from("outfits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id);

  return (
    <ProfileClient
      profile={profile}
      itemCount={itemCount || 0}
      outfitCount={outfitCount || 0}
      userId={session.user.id}
    />
  );
}
