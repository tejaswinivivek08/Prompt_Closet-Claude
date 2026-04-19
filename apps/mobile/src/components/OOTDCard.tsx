/**
 * OOTD Card — Outfit of the Day contextual recommendation
 * Shows on ClosetScreen when weather + calendar context is available.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  getCurrentWeather,
  weatherToQuery,
  getWeatherIconUrl,
  type WeatherData,
} from "../services/weatherService";
import { parseCalendarEvent } from "../services/occasionService";
import { semanticSearch } from "../services/embeddingService";
import type { SearchResult } from "../services/embeddingService";

const COLORS = {
  background: "#F5F0EA",
  card: "#FFFFFF",
  primary: "#C9847A",
  accent: "#C9A96E",
  text: "#2C2C2C",
  textSecondary: "#7A6F68",
  sunny: "#F5C842",
  rainy: "#5BA8C4",
  humid: "#7B9E87",
};

interface OOTDCardProps {
  onWearThis: () => void;
  onShuffle: () => void;
}

export default function OOTDCard({ onWearThis, onShuffle }: OOTDCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [suggestedItems, setSuggestedItems] = useState<SearchResult[]>([]);
  const [occasionText, setOccasionText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadOOTD();
  }, [user]);

  async function loadOOTD() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch weather
      const apiKey = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY;
      let weatherData: WeatherData | null = null;
      if (apiKey) {
        try {
          weatherData = await getCurrentWeather(apiKey);
          setWeather(weatherData);
        } catch (e) {
          console.warn("[OOTD] Weather fetch failed:", e);
        }
      }

      // 2. Fetch upcoming calendar events (simplified — check Supabase for stored events)
      // In production: integrate with Google Calendar API
      // For now: check if user has upcoming events in a user_preferences table
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("upcoming_event")
        .eq("user_id", user.id)
        .maybeSingle();

      const eventText = prefs?.upcoming_event ?? null;
      setOccasionText(eventText);

      // 3. Build query from weather + occasion
      const occasionCtx = parseCalendarEvent(eventText);
      const weatherQuery = weatherData ? weatherToQuery(weatherData) : "";
      const combinedQuery = [occasionCtx.query, weatherQuery]
        .filter(Boolean)
        .join(", ");

      if (!combinedQuery) {
        setLoading(false);
        return;
      }

      // 4. Semantic search with context-boosted query
      const results = await semanticSearch(user.id, combinedQuery, 4);
      setSuggestedItems(results.filter((r) => r.item != null));
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to load outfit suggestion";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleWearThis() {
    if (!user || suggestedItems.length === 0) return;
    // Save as outfit
    const itemIds = suggestedItems.filter((i) => i.item).map((i) => i.item!.id);
    const { error } = await supabase.from("outfits").insert({
      user_id: user.id,
      item_ids: itemIds,
      name: "Today's OOTD",
      occasion: occasionText,
    });
    if (error) {
      Alert.alert("Error", "Could not save outfit. Try again.");
    } else {
      onWearThis();
    }
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding your outfit...</Text>
      </View>
    );
  }

  if (error || suggestedItems.length === 0) {
    return null; // Silently skip if no context available
  }

  const occasionCtx = occasionText ? parseCalendarEvent(occasionText) : null;
  const occasionLabel = occasionCtx?.detected
    ? occasionCtx.detected.charAt(0).toUpperCase() +
      occasionCtx.detected.slice(1)
    : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Pick</Text>
          <View style={styles.contextRow}>
            {weather && (
              <View style={styles.weatherBadge}>
                <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
                <Text style={styles.weatherDesc}>{weather.description}</Text>
              </View>
            )}
            {occasionLabel && (
              <View
                style={[
                  styles.occasionBadge,
                  { backgroundColor: COLORS.accent + "20" },
                ]}
              >
                <Text style={[styles.occasionText, { color: COLORS.accent }]}>
                  {occasionLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.shuffleButton} onPress={onShuffle}>
          <Text style={styles.shuffleText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Item thumbnails */}
      <View style={styles.thumbnailRow}>
        {suggestedItems.slice(0, 4).map((result) => (
          <View key={result.item!.id} style={styles.thumbWrap}>
            <Image
              source={{
                uri: result.item!.thumbnail_url ?? result.item!.image_url,
              }}
              style={styles.thumb}
              resizeMode="cover"
            />
          </View>
        ))}
      </View>

      {/* AI tip */}
      {occasionCtx?.culturalNotes && occasionCtx.culturalNotes.length > 0 && (
        <View style={styles.tipBox}>
          <Text style={styles.tipLabel}>💡 Style tip</Text>
          <Text style={styles.tipText}>{occasionCtx.culturalNotes[0]}</Text>
        </View>
      )}

      {/* Action */}
      <TouchableOpacity style={styles.wearButton} onPress={handleWearThis}>
        <Text style={styles.wearButtonText}>Wear This Today ✓</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  contextRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  weatherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weatherTemp: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  weatherDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  occasionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  occasionText: {
    fontSize: 11,
    fontWeight: "600",
  },
  shuffleButton: {
    padding: 8,
  },
  shuffleText: {
    fontSize: 18,
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#E8E0D8",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  tipBox: {
    backgroundColor: "#F5F0EA",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  wearButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  wearButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
