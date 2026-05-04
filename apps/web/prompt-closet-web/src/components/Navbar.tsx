"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Shirt, Sparkles, User, Settings } from "lucide-react";

const navLinks = [
  { href: "/app/closet", label: "Closet", Icon: Shirt },
  { href: "/app/style", label: "Style", Icon: Sparkles },
  { href: "/app/twin", label: "Twin", Icon: User },
  { href: "/app/profile", label: "Profile", Icon: User },
  { href: "/app/settings", label: "Settings", Icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav
      className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-50"
      style={{
        backgroundColor: "rgba(245,240,234,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E5DDD5",
      }}
    >
      {/* Logo */}
      <Link href="/app/closet" className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Prompt Closet"
          style={{ height: "60px", width: "auto" }}
        />
        <span
          className="font-bold text-lg hidden sm:block"
          style={{ color: "#2B2B2B" }}
        >
          Prompt Closet
        </span>
      </Link>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.Icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                color: isActive ? "#C9847A" : "#7A6F68",
                backgroundColor: isActive
                  ? "rgba(201,132,122,0.1)"
                  : "transparent",
              }}
            >
              <Icon size={28} strokeWidth={isActive ? 2.5 : 2} />
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Desktop Sign Out */}
      <div className="hidden md:flex items-center gap-4">
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: "#F5F0EA",
              color: "#7A6F68",
              border: "1px solid #E5DDD5",
            }}
          >
            Sign Out
          </button>
        </form>
      </div>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2 rounded-lg transition-colors"
        style={{ color: "#2B2B2B" }}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="absolute top-full left-0 right-0 md:hidden"
          style={{
            backgroundColor: "rgba(245,240,234,0.98)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #E5DDD5",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex flex-col p-6 gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.Icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 text-base font-medium py-3 px-4 rounded-xl transition-all"
                  style={{
                    color: isActive ? "#C9847A" : "#7A6F68",
                    backgroundColor: isActive
                      ? "rgba(201,132,122,0.1)"
                      : "transparent",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={28} strokeWidth={isActive ? 2.5 : 2} />
                  {link.label}
                </Link>
              );
            })}
            <div
              className="pt-4 border-t mt-2"
              style={{ borderColor: "#E5DDD5" }}
            >
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium text-left"
                  style={{
                    backgroundColor: "#F5F0EA",
                    color: "#7A6F68",
                    border: "1px solid #E5DDD5",
                  }}
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
