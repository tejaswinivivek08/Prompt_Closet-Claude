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
          backgroundColor: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #E5DDD5",
          boxShadow: "0 1px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div
            className="flex items-center justify-between"
            style={{ height: 72 }}
          >
            {/* Logo */}
            <Link href="/app/closet" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Prompt Closet"
                style={{ height: 52, width: "auto" }}
              />
              <div>
                <p
                  className="font-bold leading-tight"
                  style={{ color: "#2B2B2B", fontSize: 17 }}
                >
                  Prompt Closet
                </p>
                <p
                  className="text-xs leading-tight"
                  style={{ color: "#C9847A", letterSpacing: "0.04em" }}
                >
                  AI Stylist
                </p>
              </div>
            </Link>

            <AppNav />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
