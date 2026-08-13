"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/app/closet", label: "Closet", icon: "Closet Icon.png" },
  { href: "/app/style", label: "Style", icon: "Style Icon.png" },
  { href: "/app/twin", label: "Twin", icon: "User Profile Icon.png" },
  { href: "/app/profile", label: "Profile", icon: "User Profile Icon.png" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav
      className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-50"
      style={
        {
          backgroundColor: "rgba(245,240,234,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E5DDD5",
          "--logo-size-nav": "48px",
        } as React.CSSProperties
      }
    >
      {/* Logo */}
      <Link href="/app/closet" className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Prompt Closet"
          style={{ height: "var(--logo-size-nav, 48px)", width: "auto" }}
        />
        <span className="font-bold text-lg" style={{ color: "#2B2B2B" }}>
          Prompt Closet
        </span>
      </Link>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-6">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
              style={{
                color: isActive ? "#C9847A" : "#7A6F68",
                borderBottom: isActive
                  ? "2px solid #C9847A"
                  : "2px solid transparent",
                paddingBottom: "2px",
              }}
            >
              <img
                src={`/icons/${link.icon}`}
                alt={link.label}
                className="w-4 h-4 object-contain"
              />
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
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
          <div className="flex flex-col p-6 gap-4">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 text-base font-medium py-2"
                  style={{
                    color: isActive ? "#C9847A" : "#7A6F68",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <img
                    src={`/icons/${link.icon}`}
                    alt={link.label}
                    className="w-5 h-5 object-contain"
                  />
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-4 border-t" style={{ borderColor: "#E5DDD5" }}>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-xl text-sm font-medium"
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
