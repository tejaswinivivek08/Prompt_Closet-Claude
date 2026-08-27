"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

const navItems = [
  { href: "/app/closet", label: "Closet", icon: "Closet icon.png" },
  { href: "/app/style", label: "Magic Bar", icon: "Magic Bar Icon.png" },
  { href: "/app/twin", label: "Digital Twin", icon: "Digital Twin Icon.png" },
  { href: "/app/profile", label: "Profile", icon: "Profile Icon.png" },
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
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all relative"
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
              className="object-contain"
              style={{
                width: 40,
                height: 40,
                opacity: isActive ? 1 : 0.5,
              }}
            />
            <span
              className="text-xs font-semibold"
              style={{
                color: isActive ? "#C9847A" : "#7A6F68",
                letterSpacing: "0.01em",
              }}
            >
              {label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  width: 20,
                  height: 3,
                  backgroundColor: "#C9847A",
                  borderRadius: 99,
                }}
              />
            )}
          </Link>
        );
      })}

      <div
        className="w-px mx-2"
        style={{ height: 32, backgroundColor: "#E5DDD5" }}
      />

      <form action="/api/auth/signout" method="POST" className="inline">
        <button
          type="submit"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all hover:opacity-70"
          style={{ color: "#7A6F68" }}
        >
          <LogOut size={22} />
          <span className="text-xs font-medium">Sign out</span>
        </button>
      </form>
    </div>
  );
}
