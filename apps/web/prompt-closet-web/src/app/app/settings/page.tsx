import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email_alerts, push_notifications, outfit_reminders, language, region",
    )
    .eq("id", session.user.id)
    .single();

  return (
    <SettingsClient
      email={session.user.email ?? ""}
      profile={profile ?? { id: session.user.id }}
    />
  );
}
