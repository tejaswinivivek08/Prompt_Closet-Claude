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

  if (!session) {
    redirect("/auth");
  }

  const navItems = [
    { href: "/app/closet", label: "Closet", icon: Shirt },
    { href: "/app/style", label: "Magic Bar", icon: Sparkles },
    { href: "/app/twin", label: "Digital Twin", icon: Droplet },
    { href: "/app/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-ivory">
      {/* Top nav */}
      <nav className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-rose-gold font-bold text-lg">
                Prompt Closet
              </span>
            </div>
            <div className="flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-charcoal hover:bg-ivory transition-colors"
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              ))}
              <form action="/api/auth/signout" method="POST" className="inline">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted hover:bg-ivory transition-colors ml-2"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
