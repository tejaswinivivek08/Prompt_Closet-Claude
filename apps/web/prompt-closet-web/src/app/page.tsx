"use client";

import Link from "next/link";
import {
  Sparkles,
  Shirt,
  Droplet,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: "#F5F0EA", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 px-6 py-4"
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E5DDD5",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Prompt Closet"
              style={{ height: "var(--logo-size, 48px)", width: "auto" }}
            />
            <span className="font-bold text-lg" style={{ color: "#2B2B2B" }}>
              Prompt Closet
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth"
              className="text-sm font-medium"
              style={{ color: "#7A6F68" }}
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="px-5 py-2 rounded-full text-sm font-semibold text-white"
              style={{
                backgroundColor: "#C9847A",
                boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
              }}
            >
              Try Free
            </Link>
            <a
              href="#features"
              className="text-sm font-medium cursor-pointer"
              style={{ color: "#7A6F68" }}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Features
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Logo large */}
          <div className="flex justify-center mb-8">
            <img
              src="/logo.png"
              alt="Prompt Closet"
              style={{ height: "var(--logo-size-hero, 80px)", width: "auto" }}
            />
          </div>

          <h1
            className="text-5xl font-bold mb-4 leading-tight"
            style={{ color: "#2B2B2B", fontFamily: "Georgia, serif" }}
          >
            Your wardrobe,
            <br />
            intelligently styled.
          </h1>
          <p className="text-xl mb-8" style={{ color: "#7A6F68" }}>
            AI-powered personal styling that learns your style, creates perfect
            outfits, and helps you wear everything you own.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-10">
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: "#C9847A" }}>
                148
              </p>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                avg. clothes owned
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: "#C9847A" }}>
                20%
              </p>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                actually worn
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: "#C9847A" }}>
                80%
              </p>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                wasted closet
              </p>
            </div>
          </div>

          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-lg text-white"
            style={{
              backgroundColor: "#C9847A",
              boxShadow: "0 8px 32px rgba(201,132,122,0.4)",
            }}
          >
            <Sparkles size={20} />
            Try it free
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Trusted By */}
      <section className="px-6 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium mb-4" style={{ color: "#7A6F68" }}>
            Trusted by fashion-forward professionals in Singapore
          </p>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="px-6 py-16"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-12"
            style={{ color: "#2B2B2B", fontFamily: "Georgia, serif" }}
          >
            Your AI Stylist, Always On
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Smart Closet */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #F0EBE6",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden"
                style={{ backgroundColor: "rgba(201,132,122,0.15)" }}
              >
                <img
                  src="/icons/Closet Icon.png"
                  alt="Closet"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h3
                className="font-bold text-lg mb-2"
                style={{ color: "#2B2B2B" }}
              >
                Smart Closet
              </h3>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Upload your clothes. AI auto-tags everything — category, color,
                pattern, occasions. See your whole wardrobe at a glance.
              </p>
            </div>

            {/* Magic Bar */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #F0EBE6",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden"
                style={{ backgroundColor: "rgba(201,132,122,0.15)" }}
              >
                <img
                  src="/icons/Style Icon.png"
                  alt="Style"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h3
                className="font-bold text-lg mb-2"
                style={{ color: "#2B2B2B" }}
              >
                Magic Bar
              </h3>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Tell me the occasion — I&apos;ll style the perfect outfit from
                what you already own. Diwali, office, date night, sorted.
              </p>
            </div>

            {/* Digital Twin */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #F0EBE6",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 overflow-hidden"
                style={{ backgroundColor: "rgba(201,132,122,0.15)" }}
              >
                <img
                  src="/icons/Style Icon.png"
                  alt="Digital Twin"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <h3
                className="font-bold text-lg mb-2"
                style={{ color: "#2B2B2B" }}
              >
                Digital Twin
              </h3>
              <p className="text-sm" style={{ color: "#7A6F68" }}>
                Create your AI avatar and virtually try on outfits before you
                wear them. No more closet regrets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm mb-4" style={{ color: "#7A6F68" }}>
            Loved by fashion-forward professionals in Singapore
          </p>
          <div className="flex justify-center gap-4 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={20} fill="#C9847A" color="#C9847A" />
            ))}
          </div>
          <p className="italic text-sm" style={{ color: "#7A6F68" }}>
            &quot;I finally wore all my sarees instead of just the same 3.
            Prompt Closet is like having a personal stylist.&quot;
          </p>
          <p className="text-xs mt-2" style={{ color: "#C9847A" }}>
            — Priya S., Marketing Manager
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl font-bold text-center mb-12"
            style={{ color: "#2B2B2B", fontFamily: "Georgia, serif" }}
          >
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #F0EBE6",
              }}
            >
              <h3
                className="font-bold text-lg mb-1"
                style={{ color: "#2B2B2B" }}
              >
                Free
              </h3>
              <p
                className="text-3xl font-bold mb-4"
                style={{ color: "#C9847A" }}
              >
                S$0
                <span
                  className="text-sm font-normal"
                  style={{ color: "#7A6F68" }}
                >
                  /mo
                </span>
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "50 wardrobe items",
                  "20 AI outfit suggestions",
                  "Basic style profile",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "#2B2B2B" }}
                  >
                    <Check size={14} style={{ color: "#C9847A" }} /> {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="block text-center py-2.5 rounded-xl font-semibold text-sm"
                style={{
                  backgroundColor: "#F5F0EA",
                  color: "#2B2B2B",
                  border: "1px solid #E5DDD5",
                }}
              >
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div
              className="rounded-2xl p-6 relative"
              style={{
                backgroundColor: "#FFFFFF",
                border: "2px solid #C9847A",
                boxShadow: "0 8px 32px rgba(201,132,122,0.2)",
              }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: "#C9847A" }}
              >
                Most Popular
              </div>
              <h3
                className="font-bold text-lg mb-1"
                style={{ color: "#2B2B2B" }}
              >
                Pro
              </h3>
              <p
                className="text-3xl font-bold mb-4"
                style={{ color: "#C9847A" }}
              >
                S$9.99
                <span
                  className="text-sm font-normal"
                  style={{ color: "#7A6F68" }}
                >
                  /mo
                </span>
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "Unlimited wardrobe items",
                  "Unlimited AI suggestions",
                  "Digital Twin avatar",
                  "Virtual try-on",
                  "Style DNA analysis",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "#2B2B2B" }}
                  >
                    <Check size={14} style={{ color: "#C9847A" }} /> {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="block text-center py-2.5 rounded-xl font-semibold text-sm text-white"
                style={{
                  backgroundColor: "#C9847A",
                  boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
                }}
              >
                Start Pro Trial
              </Link>
            </div>

            {/* Business */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #F0EBE6",
              }}
            >
              <h3
                className="font-bold text-lg mb-1"
                style={{ color: "#2B2B2B" }}
              >
                Business
              </h3>
              <p
                className="text-3xl font-bold mb-4"
                style={{ color: "#C9847A" }}
              >
                S$49.99
                <span
                  className="text-sm font-normal"
                  style={{ color: "#7A6F68" }}
                >
                  /mo
                </span>
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  "Everything in Pro",
                  "Team wardrobes",
                  "Style analytics dashboard",
                  "API access",
                  "Priority support",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "#2B2B2B" }}
                  >
                    <Check size={14} style={{ color: "#C9847A" }} /> {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="block text-center py-2.5 rounded-xl font-semibold text-sm"
                style={{
                  backgroundColor: "#F5F0EA",
                  color: "#2B2B2B",
                  border: "1px solid #E5DDD5",
                }}
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8" style={{ backgroundColor: "#2B2B2B" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Prompt Closet"
                className="h-6 w-auto brightness-0 invert"
              />
              <span className="font-bold text-sm text-white">
                Prompt Closet
              </span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-xs" style={{ color: "#7A6F68" }}>
                Privacy
              </a>
              <a href="#" className="text-xs" style={{ color: "#7A6F68" }}>
                Terms
              </a>
              <a href="#" className="text-xs" style={{ color: "#7A6F68" }}>
                Contact
              </a>
            </div>
            <p className="text-xs" style={{ color: "#7A6F68" }}>
              © 2026 Prompt Closet. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
