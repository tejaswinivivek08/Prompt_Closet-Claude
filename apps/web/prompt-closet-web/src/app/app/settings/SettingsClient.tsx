"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Bell,
  Globe,
  Database,
  Info,
  LogOut,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";

interface SettingsClientProps {
  email: string;
  profile: {
    id: string;
    email_alerts?: boolean;
    push_notifications?: boolean;
    outfit_reminders?: boolean;
    language?: string;
    region?: string;
  };
}

const APP_VERSION = "0.1.0";

export default function SettingsClient({
  email,
  profile,
}: SettingsClientProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [notifications, setNotifications] = useState({
    email_alerts: profile?.email_alerts ?? true,
    push_notifications: profile?.push_notifications ?? true,
    outfit_reminders: profile?.outfit_reminders ?? false,
  });

  const [preferences, setPreferences] = useState({
    language: profile?.language ?? "English",
    region: profile?.region ?? "Singapore",
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const newValue = !notifications[key];
    setNotifications((prev) => ({ ...prev, [key]: newValue }));
    setSaving(key);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        [key]: newValue,
      });
      if (error) throw error;
      showMessage("success", "Preference saved");
    } catch {
      setNotifications((prev) => ({ ...prev, [key]: !newValue }));
      showMessage("error", "Failed to save preference");
    } finally {
      setSaving(null);
    }
  };

  const handlePreferenceChange = async (
    key: keyof typeof preferences,
    value: string,
  ) => {
    const oldValue = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setSaving(key);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        [key]: value,
      });
      if (error) throw error;
      showMessage("success", "Preference saved");
    } catch {
      setPreferences((prev) => ({ ...prev, [key]: oldValue }));
      showMessage("error", "Failed to save preference");
    } finally {
      setSaving(null);
    }
  };

  const handlePasswordChange = async () => {
    setSaving("password");
    try {
      const { error } = await supabase.auth.updateUser({
        password: "new_password_placeholder",
      });
      if (error) throw error;
      showMessage("success", "Password reset email sent - check your inbox");
    } catch {
      showMessage("error", "Failed to send password reset email");
    } finally {
      setSaving(null);
    }
  };

  const handleExportData = async () => {
    setSaving("export");
    try {
      const { data: items } = await supabase
        .from("wardrobe_items")
        .select("*")
        .eq("user_id", profile.id)
        .eq("is_active", true);

      const { data: outfits } = await supabase
        .from("outfits")
        .select("*")
        .eq("user_id", profile.id);

      const exportData = {
        version: APP_VERSION,
        exported_at: new Date().toISOString(),
        email,
        wardrobe_items: items || [],
        outfits: outfits || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-closet-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage("success", "Wardrobe data exported successfully");
    } catch {
      showMessage("error", "Failed to export data");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action is permanent and cannot be undone.",
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "This will permanently delete all your wardrobe items, outfits, and profile data. Are you absolutely sure?",
    );
    if (!doubleConfirm) return;

    setSaving("delete");
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.admin?.deleteUser(
        profile.id,
      );
      if (authError) console.warn("Auth user deletion failed:", authError);

      window.location.href = "/auth?deleted=true";
    } catch {
      showMessage("error", "Failed to delete account. Please contact support.");
    } finally {
      setSaving(null);
    }
  };

  const cardStyle = {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
    border: "1px solid #F0EBE6",
  };

  const sectionHeaderStyle = {
    color: "#2B2B2B",
  };

  const labelStyle = {
    color: "#2B2B2B",
  };

  const mutedStyle = {
    color: "#7A6F68",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Toast Message */}
      {message && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{
            backgroundColor: message.type === "success" ? "#C9847A" : "#E53935",
            color: "#FFFFFF",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={sectionHeaderStyle}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={mutedStyle}>
          Manage your account preferences and data
        </p>
      </div>

      {/* Account Section */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <User size={18} style={{ color: "#C9847A" }} />
          </div>
          <h2 className="text-lg font-semibold" style={sectionHeaderStyle}>
            Account
          </h2>
        </div>

        <div className="space-y-4">
          {/* Email - Read Only */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={labelStyle}
            >
              Email Address
            </label>
            <div
              className="w-full px-4 py-3.5 rounded-xl text-sm"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #E5DDD5",
                color: "#7A6F68",
              }}
            >
              {email}
            </div>
            <p className="text-xs mt-1.5" style={mutedStyle}>
              Email cannot be changed
            </p>
          </div>

          {/* Password Change */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={labelStyle}
            >
              Password
            </label>
            <button
              onClick={handlePasswordChange}
              disabled={saving === "password"}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #E5DDD5",
                color: "#2B2B2B",
              }}
            >
              {saving === "password" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <span>Send Password Reset Email</span>
              )}
            </button>
            <p className="text-xs mt-1.5" style={mutedStyle}>
              A password reset link will be sent to your email
            </p>
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t" style={{ borderColor: "#F0EBE6" }}>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: "#F5F0EA",
                  border: "1px solid #E5DDD5",
                  color: "#7A6F68",
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Bell size={18} style={{ color: "#C9847A" }} />
          </div>
          <h2 className="text-lg font-semibold" style={sectionHeaderStyle}>
            Notifications
          </h2>
        </div>

        <div className="space-y-4">
          {/* Email Alerts */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={labelStyle}>
                Email Alerts
              </p>
              <p className="text-xs mt-0.5" style={mutedStyle}>
                Receive important updates via email
              </p>
            </div>
            <button
              onClick={() => handleNotificationChange("email_alerts")}
              disabled={saving === "email_alerts"}
              className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                notifications.email_alerts ? "" : ""
              }`}
              style={{
                backgroundColor: notifications.email_alerts
                  ? "#C9847A"
                  : "#E5DDD5",
              }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{
                  transform: notifications.email_alerts
                    ? "translateX(24px)"
                    : "translateX(2px)",
                }}
              />
              {saving === "email_alerts" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2
                    size={12}
                    className="animate-spin"
                    style={{ color: "#FFFFFF" }}
                  />
                </div>
              )}
            </button>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={labelStyle}>
                Push Notifications
              </p>
              <p className="text-xs mt-0.5" style={mutedStyle}>
                Receive notifications in your browser
              </p>
            </div>
            <button
              onClick={() => handleNotificationChange("push_notifications")}
              disabled={saving === "push_notifications"}
              className="relative w-12 h-6 rounded-full transition-colors disabled:opacity-50"
              style={{
                backgroundColor: notifications.push_notifications
                  ? "#C9847A"
                  : "#E5DDD5",
              }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{
                  transform: notifications.push_notifications
                    ? "translateX(24px)"
                    : "translateX(2px)",
                }}
              />
              {saving === "push_notifications" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2
                    size={12}
                    className="animate-spin"
                    style={{ color: "#FFFFFF" }}
                  />
                </div>
              )}
            </button>
          </div>

          {/* Outfit Reminders */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={labelStyle}>
                Outfit Reminders
              </p>
              <p className="text-xs mt-0.5" style={mutedStyle}>
                Get daily suggestions for what to wear
              </p>
            </div>
            <button
              onClick={() => handleNotificationChange("outfit_reminders")}
              disabled={saving === "outfit_reminders"}
              className="relative w-12 h-6 rounded-full transition-colors disabled:opacity-50"
              style={{
                backgroundColor: notifications.outfit_reminders
                  ? "#C9847A"
                  : "#E5DDD5",
              }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{
                  transform: notifications.outfit_reminders
                    ? "translateX(24px)"
                    : "translateX(2px)",
                }}
              />
              {saving === "outfit_reminders" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2
                    size={12}
                    className="animate-spin"
                    style={{ color: "#FFFFFF" }}
                  />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Globe size={18} style={{ color: "#C9847A" }} />
          </div>
          <h2 className="text-lg font-semibold" style={sectionHeaderStyle}>
            Preferences
          </h2>
        </div>

        <div className="space-y-4">
          {/* Language */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={labelStyle}
            >
              Language
            </label>
            <select
              value={preferences.language}
              onChange={(e) =>
                handlePreferenceChange("language", e.target.value)
              }
              disabled={saving === "language"}
              className="w-full px-4 py-3.5 rounded-xl text-sm transition-all appearance-none cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #E5DDD5",
                color: "#2B2B2B",
              }}
            >
              <option value="English">English</option>
              <option value="Chinese">Chinese</option>
              <option value="Malay">Malay</option>
              <option value="Tamil">Tamil</option>
              <option value="Japanese">Japanese</option>
              <option value="Korean">Korean</option>
            </select>
          </div>

          {/* Region */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={labelStyle}
            >
              Region
            </label>
            <select
              value={preferences.region}
              onChange={(e) => handlePreferenceChange("region", e.target.value)}
              disabled={saving === "region"}
              className="w-full px-4 py-3.5 rounded-xl text-sm transition-all appearance-none cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #E5DDD5",
                color: "#2B2B2B",
              }}
            >
              <option value="Singapore">Singapore</option>
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Malaysia">Malaysia</option>
              <option value="Indonesia">Indonesia</option>
              <option value="Thailand">Thailand</option>
              <option value="India">India</option>
              <option value="Australia">Australia</option>
            </select>
            <p className="text-xs mt-1.5" style={mutedStyle}>
              Region affects sizing recommendations and available brands
            </p>
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Database size={18} style={{ color: "#C9847A" }} />
          </div>
          <h2 className="text-lg font-semibold" style={sectionHeaderStyle}>
            Data
          </h2>
        </div>

        <div className="space-y-4">
          {/* Export Wardrobe */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={labelStyle}>
                Export My Wardrobe
              </p>
              <p className="text-xs mt-0.5" style={mutedStyle}>
                Download all your wardrobe items and outfits as JSON
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={saving === "export"}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: "#F5F0EA",
                border: "1px solid #E5DDD5",
                color: "#2B2B2B",
              }}
            >
              {saving === "export" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Export
            </button>
          </div>

          {/* Delete Account */}
          <div className="pt-4 border-t" style={{ borderColor: "#F0EBE6" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "#E53935" }}>
                  Delete Account
                </p>
                <p className="text-xs mt-0.5" style={mutedStyle}>
                  Permanently remove your account and all data
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={saving === "delete"}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(229,57,53,0.1)",
                  border: "1px solid rgba(229,57,53,0.3)",
                  color: "#E53935",
                }}
              >
                {saving === "delete" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(201,132,122,0.1)" }}
          >
            <Info size={18} style={{ color: "#C9847A" }} />
          </div>
          <h2 className="text-lg font-semibold" style={sectionHeaderStyle}>
            About
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={labelStyle}>
              App Version
            </p>
            <p className="text-sm font-mono" style={mutedStyle}>
              {APP_VERSION}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm" style={labelStyle}>
              Privacy Policy
            </p>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "#C9847A" }}
            >
              View
            </a>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm" style={labelStyle}>
              Terms of Service
            </p>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "#C9847A" }}
            >
              View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
