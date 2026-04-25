import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Droplet, Sparkles, User, Shirt, LogOut } from "lucide-react";

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

  const navItems = [
    { href: "/app/closet", label: "Closet", icon: Shirt },
    { href: "/app/style", label: "Magic Bar", icon: Sparkles },
    { href: "/app/twin", label: "Digital Twin", icon: Droplet },
    { href: "/app/profile", label: "Profile", icon: User },
  ];

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
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "#C9847A" }}
              >
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span
                className="font-bold text-base"
                style={{ color: "#2B2B2B" }}
              >
                Prompt Closet
              </span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-80"
                  style={{ color: "#2B2B2B" }}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              ))}
              <form
                action="/api/auth/signout"
                method="POST"
                className="inline ml-2"
              >
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all hover:opacity-70"
                  style={{ color: "#7A6F68" }}
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
