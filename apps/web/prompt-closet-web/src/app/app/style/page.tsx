import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StyleClient from "./StyleClient";

export const dynamic = "force-dynamic";

export default async function StylePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth");

  const { data: items } = await supabase
    .from("wardrobe_items")
    .select(
      "id, image_url, category, colors, occasions, suggested_name, formality_score",
    )
    .eq("user_id", session.user.id)
    .eq("is_active", true);

  return <StyleClient initialItems={items || []} userId={session.user.id} />;
}
