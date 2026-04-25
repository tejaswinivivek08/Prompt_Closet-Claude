"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav
      className="w-full px-8 py-4 flex items-center justify-between sticky top-0 z-50"
      style={{
        backgroundColor: "rgba(245,240,234,0.95)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #E5DDD5",
      }}
    >
      <Link href="/" className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#C9847A" }}
        >
          <span className="text-white text-sm font-bold">P</span>
        </div>
        <span className="text-lg font-bold" style={{ color: "#2B2B2B" }}>
          Prompt Closet
        </span>
      </Link>
      <Link
        href="/auth"
        className="px-5 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90"
        style={{ backgroundColor: "#C9847A", color: "#FFFFFF" }}
      >
        Sign in
      </Link>
    </nav>
  );
}
