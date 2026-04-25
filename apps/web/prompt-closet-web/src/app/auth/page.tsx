"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        : await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for the magic link!");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="bg-white rounded-card shadow-sm border border-border p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-charcoal mb-2">
          {mode === "signin" ? "Welcome back" : "Create your closet"}
        </h1>
        <p className="text-muted mb-6 text-sm">
          {mode === "signin"
            ? "Sign in to access your wardrobe"
            : "Start building your AI wardrobe"}
        </p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "signin"
                ? "bg-rose-gold text-white"
                : "bg-ivory text-charcoal"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-rose-gold text-white"
                : "bg-ivory text-charcoal"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-gold text-charcoal"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-gold text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? "Sending..."
              : mode === "signin"
                ? "Send Magic Link"
                : "Create Account"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm text-center ${message.includes("Check") ? "text-green-600" : "text-red-500"}`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
