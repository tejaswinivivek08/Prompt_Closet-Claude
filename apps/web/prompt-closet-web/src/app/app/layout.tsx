import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AppNav from "@/components/AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/auth");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Top nav */}
      <nav
        className="sticky top-0 z-50"
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E5DDD5",
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/app/closet" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Prompt Closet"
                style={{ height: "40px", width: "auto" }}
              />
              <span
                className="font-bold text-base"
                style={{ color: "#2B2B2B" }}
              >
                Prompt Closet
              </span>
            </Link>

            <AppNav />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
