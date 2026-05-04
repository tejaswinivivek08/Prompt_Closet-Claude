"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        window.location.href = "/app/closet";
      }
    } else {
      if (password !== confirmPassword) {
        setMessage({ text: "Passwords do not match", type: "error" });
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setMessage({
          text: "Password must be at least 6 characters",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "Account created! Check your email to confirm, then sign in.",
          type: "success",
        });
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F5F0EA" }}>
      {/* Left panel — branding */}
      <div
        className="hidden md:flex flex-col justify-between w-1/2 p-12"
        style={{ backgroundColor: "#C9847A" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-white font-bold text-xl">Prompt Closet</span>
        </div>

        <div>
          <h2
            className="text-4xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Your wardrobe,
            <br />
            intelligently styled.
          </h2>
          <p className="text-white/80 text-lg">
            AI-powered personal styling for your everyday life.
          </p>
        </div>

        <p className="text-white/60 text-sm">© 2026 Prompt Closet</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2 mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#C9847A" }}
            >
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl" style={{ color: "#2B2B2B" }}>
              Prompt Closet
            </span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: "#2B2B2B" }}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mb-8 text-sm" style={{ color: "#7A6F68" }}>
            {mode === "signin"
              ? "Sign in to access your wardrobe"
              : "Start building your AI wardrobe today"}
          </p>

          {/* Tab switcher */}
          <div
            className="flex rounded-xl p-1 mb-6"
            style={{ backgroundColor: "#F5F0EA" }}
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setMessage(null);
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: mode === m ? "#FFFFFF" : "transparent",
                  color: mode === m ? "#2B2B2B" : "#7A6F68",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#2B2B2B" }}
              >
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3.5 rounded-xl text-sm transition-all"
                style={{
                  backgroundColor: "#F5F0EA",
                  border: "1px solid #E5DDD5",
                  color: "#2B2B2B",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#2B2B2B" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3.5 rounded-xl text-sm transition-all"
                style={{
                  backgroundColor: "#F5F0EA",
                  border: "1px solid #E5DDD5",
                  color: "#2B2B2B",
                  outline: "none",
                }}
              />
            </div>

            {mode === "signup" && (
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#2B2B2B" }}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-4 py-3.5 rounded-xl text-sm transition-all"
                  style={{
                    backgroundColor: "#F5F0EA",
                    border: "1px solid #E5DDD5",
                    color: "#2B2B2B",
                    outline: "none",
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: "#C9847A",
                boxShadow: "0 4px 16px rgba(201,132,122,0.35)",
              }}
            >
              {loading
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          {message && (
            <div
              className="mt-4 px-4 py-3 rounded-xl text-sm text-center"
              style={{
                backgroundColor:
                  message.type === "success" ? "#ECFDF5" : "#FEF2F2",
                color: message.type === "success" ? "#059669" : "#DC2626",
              }}
            >
              {message.text}
            </div>
          )}

          <p className="mt-8 text-center text-xs" style={{ color: "#7A6F68" }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>

          {/* Demo credentials hint */}
          <div
            className="mt-6 p-3 rounded-xl text-xs text-center"
            style={{ backgroundColor: "#F5F0EA", color: "#7A6F68" }}
          >
            Demo: tejaswini.smu.mba@gmail.com
          </div>
        </div>
      </div>
    </div>
  );
}
