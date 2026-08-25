"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

const navItems = [
  { href: "/app/closet", label: "Closet", icon: "Closet Icon.png" },
  { href: "/app/style", label: "Magic Bar", icon: "Style Icon.png" },
  { href: "/app/twin", label: "Digital Twin", icon: "User Profile Icon.png" },
  { href: "/app/profile", label: "Profile", icon: "User Profile Icon.png" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {navItems.map(({ href, label, icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              color: isActive ? "#C9847A" : "#7A6F68",
              backgroundColor: isActive
                ? "rgba(201,132,122,0.1)"
                : "transparent",
            }}
          >
            <img
              src={`/icons/${icon}`}
              alt={label}
              className="w-6 h-6 object-contain"
              style={{ opacity: isActive ? 1 : 0.7 }}
            />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
      <form action="/api/auth/signout" method="POST" className="inline ml-2">
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all hover:opacity-70"
          style={{ color: "#7A6F68" }}
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </form>
    </div>
  );
}
