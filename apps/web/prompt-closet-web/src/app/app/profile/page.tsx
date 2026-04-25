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

  // Fetch the active Digital Twin avatar
  const { data: avatars } = await supabase
    .from("user_avatars")
    .select("avatar_url")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const twinAvatarUrl = avatars?.[0]?.avatar_url || null;

  // Merge twin avatar into profile for display
  const profileWithTwin = {
    ...profile,
    avatar_url: twinAvatarUrl || profile?.avatar_url || "",
  };

  const { count: itemCount } = await supabase
    .from("wardrobe_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("is_active", true);

  const { count: outfitCount } = await supabase
    .from("outfits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.user.id);

  // Get most worn item
  const { data: mostWornItems } = await supabase
    .from("wardrobe_items")
    .select("name")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .order("wear_count", { ascending: false })
    .limit(1);

  const mostWornItem = mostWornItems?.[0]?.name || undefined;

  return (
    <ProfileClient
      profile={profileWithTwin}
      itemCount={itemCount || 0}
      outfitCount={outfitCount || 0}
      userId={session.user.id}
      mostWornItem={mostWornItem}
    />
  );
}
