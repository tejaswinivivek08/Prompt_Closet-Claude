import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const SKIN_TONES = [
  { label: "Fair Cool", value: "fair-cool", hex: "#FDEBD3" },
  { label: "Fair Warm", value: "fair-warm", hex: "#F5CBA7" },
  { label: "Medium Cool", value: "medium-cool", hex: "#C8A47E" },
  { label: "Medium Warm", value: "medium-warm", hex: "#A0522D" },
  { label: "Deep Cool", value: "deep-cool", hex: "#6B3E26" },
  { label: "Deep Warm", value: "deep-warm", hex: "#3E1F0D" },
];

// 2D skin tone palette: rows = undertone (cool→neutral→warm), cols = depth (light→deep)
const SKIN_TONE_GRID: { undertone: string; depth: string; hex: string }[] = [
  // Light
  { undertone: "cool", depth: "light", hex: "#FAE7E0" },
  { undertone: "neutral", depth: "light", hex: "#F5DEB3" },
  { undertone: "warm", depth: "light", hex: "#FFE4C4" },
  // Fair
  { undertone: "cool", depth: "fair", hex: "#FDEBD3" },
  { undertone: "neutral", depth: "fair", hex: "#F0D5B0" },
  { undertone: "warm", depth: "fair", hex: "#F5CBA7" },
  // Medium Light
  { undertone: "cool", depth: "medium-light", hex: "#E8C4A0" },
  { undertone: "neutral", depth: "medium-light", hex: "#DEB887" },
  { undertone: "warm", depth: "medium-light", hex: "#D2A679" },
  // Medium
  { undertone: "cool", depth: "medium", hex: "#C8A47E" },
  { undertone: "neutral", depth: "medium", hex: "#BF9B76" },
  { undertone: "warm", depth: "medium", hex: "#B8860B" },
  // Olive
  { undertone: "cool", depth: "olive", hex: "#A08060" },
  { undertone: "neutral", depth: "olive", hex: "#9B7B4D" },
  { undertone: "warm", depth: "olive", hex: "#8B6914" },
  // Tan
  { undertone: "cool", depth: "tan", hex: "#8D6346" },
  { undertone: "neutral", depth: "tan", hex: "#7B5C3E" },
  { undertone: "warm", depth: "tan", hex: "#6B4423" },
  // Deep
  { undertone: "cool", depth: "deep", hex: "#6B3E26" },
  { undertone: "neutral", depth: "deep", hex: "#5B3A1E" },
  { undertone: "warm", depth: "deep", hex: "#4B2B12" },
  // Dark
  { undertone: "cool", depth: "dark", hex: "#3E1F0D" },
  { undertone: "neutral", depth: "dark", hex: "#2E1508" },
  { undertone: "warm", depth: "dark", hex: "#1E0A00" },
];

const UNDERTONES = ["cool", "neutral", "warm"] as const;
const DEPTHS = [
  "light",
  "fair",
  "medium-light",
  "medium",
  "olive",
  "tan",
  "deep",
  "dark",
] as const;

const STYLE_PREFERENCES = [
  "Minimalist",
  "Streetwear",
  "Formal",
  "Festive",
  "Casual",
  "Maximalist",
  "Vintage",
  "Bohemian",
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [skinTone, setSkinTone] = useState<string | null>(null);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [stylePrefs, setStylePrefs] = useState<string[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [outfitsCreated, setOutfitsCreated] = useState(0);
  const [daysActive, setDaysActive] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) {
      setName(data.full_name ?? "");
      setSkinTone(data.skin_tone_palette ?? null);
      const m = (data.body_measurements as Record<string, string>) ?? {};
      setHeight(m.height ?? "");
      setWeight(m.weight ?? "");
      if (data.style_preferences) {
        setStylePrefs(data.style_preferences as string[]);
      }
    }
  };

  const loadStats = async () => {
    if (!user) return;
    const { count: items } = await supabase
      .from("wardrobe_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);
    const { count: outfits } = await supabase
      .from("outfits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .single();
    let days = 0;
    if (profile?.created_at) {
      const created = new Date(profile.created_at);
      const now = new Date();
      days = Math.floor((now.getTime() - created.getTime()) / 86400000);
    }
    setTotalItems(items ?? 0);
    setOutfitsCreated(outfits ?? 0);
    setDaysActive(days > 0 ? days : 1);
  };

  const autoSave = async (
    fields: Partial<{
      full_name: string;
      height: string;
      weight: string;
      skin_tone_palette: string | null;
      style_preferences: string[];
    }>,
  ) => {
    if (!user) return;
    await supabase.from("profiles").upsert({
      id: user.id,
      ...fields,
      body_measurements:
        fields.height !== undefined || fields.weight !== undefined
          ? { height, weight }
          : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleStylePref = (pref: string) => {
    const next = stylePrefs.includes(pref)
      ? stylePrefs.filter((p) => p !== pref)
      : [...stylePrefs, pref];
    setStylePrefs(next);
    autoSave({ style_preferences: next });
  };

  const handleSkinToneChange = (hex: string) => {
    const next = skinTone === hex ? null : hex;
    setSkinTone(next);
    autoSave({ skin_tone_palette: next });
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.nameRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={(v) => {
                setName(v);
                autoSave({ full_name: v });
              }}
              placeholder="Your name"
              placeholderTextColor="#A0978E"
            />
            {saved && <Text style={styles.savedBadge}>Saved ✓</Text>}
          </View>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Body Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Body Profile</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Height (cm)</Text>
              <TextInput
                style={[styles.metricValue, styles.metricTextInput]}
                value={height}
                onChangeText={(v) => {
                  setHeight(v);
                  autoSave({ height: v });
                }}
                placeholder="—"
                placeholderTextColor="#A0978E"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Weight (kg)</Text>
              <TextInput
                style={[styles.metricValue, styles.metricTextInput]}
                value={weight}
                onChangeText={(v) => {
                  setWeight(v);
                  autoSave({ weight: v });
                }}
                placeholder="—"
                placeholderTextColor="#A0978E"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={[styles.cardLabel, { marginTop: 16 }]}>Skin Tone</Text>
          {/* 2D Grid: rows by undertone, columns by depth */}
          {UNDERTONES.map((undertone) => (
            <View key={undertone} style={styles.skinToneRow}>
              <Text style={styles.undertoneLabel}>{undertone}</Text>
              <View style={styles.skinToneColors}>
                {DEPTHS.map((depth) => {
                  const entry = SKIN_TONE_GRID.find(
                    (g) => g.undertone === undertone && g.depth === depth,
                  );
                  if (!entry) return null;
                  return (
                    <TouchableOpacity
                      key={depth}
                      onPress={() => handleSkinToneChange(entry.hex)}
                      style={[
                        styles.skinSwatch,
                        { backgroundColor: entry.hex },
                        skinTone === entry.hex && styles.skinSwatchSelected,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Face Scan Card */}
        <View style={styles.card}>
          <View style={styles.faceScanRow}>
            <Text style={styles.faceIcon}>🤳</Text>
            <View style={styles.faceScanContent}>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
              <Text style={styles.faceDesc}>
                AI-powered personal color analysis and style recommendations
                based on your features.
              </Text>
            </View>
          </View>
        </View>

        {/* Style Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Style Preferences</Text>
          <View style={styles.chipsRow}>
            {STYLE_PREFERENCES.map((pref) => (
              <TouchableOpacity
                key={pref}
                style={[
                  styles.chip,
                  stylePrefs.includes(pref) && styles.chipActive,
                ]}
                onPress={() => toggleStylePref(pref)}
              >
                <Text
                  style={[
                    styles.chipText,
                    stylePrefs.includes(pref) && styles.chipTextActive,
                  ]}
                >
                  {pref}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalItems}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{outfitsCreated}</Text>
            <Text style={styles.statLabel}>Outfits</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{daysActive}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
        </View>

        {/* Settings */}
        <TouchableOpacity style={styles.settingsRow}>
          <Text style={styles.settingsIcon}>⚙️</Text>
          <Text style={styles.settingsText}>Settings</Text>
          <Text style={styles.settingsArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0EA",
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: "relative",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#C9847A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#C9847A",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2B2B2B",
    textAlign: "center",
  },
  userEmail: {
    fontSize: 13,
    color: "#A0978E",
    textAlign: "center",
    marginTop: 2,
  },
  editIconBtn: {
    position: "absolute",
    top: 32,
    right: 20,
    padding: 6,
  },
  editIconText: {
    fontSize: 18,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nameInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 160,
    fontSize: 16,
    color: "#2B2B2B",
  },
  savedBadge: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  editNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 160,
  },
  editInputText: {
    fontSize: 16,
    color: "#2B2B2B",
    textAlign: "center",
  },
  placeholder: {
    color: "#A0978E",
  },
  editSaveBtn: {
    backgroundColor: "#C9847A",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A6F68",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7A6F68",
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E8E0D8",
  },
  metricLabel: {
    fontSize: 12,
    color: "#A0978E",
    fontWeight: "500",
    marginBottom: 6,
  },
  metricInput: {
    paddingVertical: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2B2B2B",
  },
  metricTextInput: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2B2B2B",
    backgroundColor: "#F5F0EA",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: "center",
    minWidth: 80,
  },
  skinToneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  undertoneLabel: {
    fontSize: 10,
    color: "#A0978E",
    fontWeight: "500",
    width: 52,
    textTransform: "capitalize",
  },
  skinToneColors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skinSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  skinSwatchSelected: {
    borderColor: "#C9847A",
    borderWidth: 3,
  },
  skinCheck: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  skinLabel: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
    color: "#7A6F68",
    fontWeight: "500",
  },
  faceScanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  faceIcon: {
    fontSize: 36,
  },
  faceScanContent: {
    flex: 1,
  },
  comingSoonBadge: {
    backgroundColor: "#C9847A",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  comingSoonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  faceDesc: {
    fontSize: 13,
    color: "#7A6F68",
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E0D8",
    backgroundColor: "#FAFAFA",
  },
  chipActive: {
    borderColor: "#C9847A",
    backgroundColor: "#C9847A",
  },
  chipText: {
    fontSize: 13,
    color: "#7A6F68",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "700",
    color: "#C9847A",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#A0978E",
    fontWeight: "500",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  settingsIcon: {
    fontSize: 20,
  },
  settingsText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#2B2B2B",
  },
  settingsArrow: {
    fontSize: 20,
    color: "#A0978E",
  },
  bottomSpacer: {
    height: 40,
  },
});
