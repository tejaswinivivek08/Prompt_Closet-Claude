import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClosetClient from "./ClosetClient";

export default async function ClosetPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth");

  const { data: items } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return <ClosetClient initialItems={items || []} userId={session.user.id} />;
}
