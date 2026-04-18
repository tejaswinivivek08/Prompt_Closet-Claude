import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useNetwork } from "../../contexts/NetworkContext";
import { supabase } from "../../lib/supabase";
import { semanticSearch } from "../../services/embeddingService";
import type { SearchResult } from "../../services/embeddingService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================
// DESIGN TOKENS
// ============================================================

const COLORS = {
  background: "#F5F0EA",
  card: "#FFFFFF",
  primary: "#C9847A",
  text: "#2C2C2C",
  textSecondary: "#7A6F68",
  border: "#E5DDD5",
  casual: "#7B9E87",
  office: "#4A7B9D",
  festive: "#C9A96E",
  party: "#B5A0C9",
  temple: "#C9847A",
};

const OCCASION_COLORS: Record<string, string> = {
  casual: COLORS.casual,
  office: COLORS.office,
  festive: COLORS.festive,
  wedding: COLORS.festive,
  party: COLORS.party,
  temple: COLORS.temple,
  beach: COLORS.casual,
  date: COLORS.party,
};

const QUICK_PROMPTS = [
  "Office outfit for tomorrow",
  "Something festive",
  "Casual weekend look",
];

const INPUT_PLACEHOLDERS = [
  "Something for a rainy day meeting",
  "Diwali party outfit, festive but not too heavy",
  "Casual Sunday brunch, feel good vibes",
];

// ============================================================
// TYPES
// ============================================================

interface OutfitItem {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  suggested_name: string;
  category: string;
  colors: string[];
  occasions: string[];
  formality_score: number;
}

interface OutfitSuggestion {
  outfit_name: string;
  item_ids: string[];
  occasion_fit: string;
  styling_tip: string;
  confidence: number;
}

// ============================================================
// ANIMATED SHIMMER COMPONENT
// ============================================================

function ShimmerView({
  style,
  children,
}: {
  style: object;
  children?: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

// ============================================================
// LOADING STATE COMPONENT
// ============================================================

function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <ShimmerView style={styles.shimmerContainer}>
        <View style={styles.loadingCard}>
          <View style={styles.loadingHeader}>
            <View style={styles.shimmerLineMedium} />
          </View>
          <View style={styles.loadingThumbnails}>
            <View style={styles.loadingThumb} />
            <View style={styles.loadingThumb} />
            <View style={styles.loadingThumb} />
          </View>
          <View style={styles.loadingFooter}>
            <View style={styles.shimmerLineShort} />
            <View style={styles.shimmerLineLong} />
          </View>
        </View>
      </ShimmerView>
      <Text style={styles.loadingText}>Styling you...</Text>
    </View>
  );
}

// ============================================================
// OUTFIT CARD COMPONENT
// ============================================================

interface OutfitCardProps {
  outfit: OutfitSuggestion;
  items: OutfitItem[];
  onSave: (outfit: OutfitSuggestion, items: OutfitItem[]) => void;
  saving: boolean;
}

function OutfitCard({ outfit, items, onSave, saving }: OutfitCardProps) {
  const occasionColor =
    OCCASION_COLORS[outfit.occasion_fit.toLowerCase()] || COLORS.primary;

  const outfitItems = outfit.item_ids
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is OutfitItem => item != null)
    .slice(0, 4);

  return (
    <View style={styles.outfitCard}>
      {/* Occasion badge */}
      <View
        style={[
          styles.occasionBadge,
          { backgroundColor: occasionColor + "20" },
        ]}
      >
        <Text style={[styles.occasionBadgeText, { color: occasionColor }]}>
          {outfit.occasion_fit.charAt(0).toUpperCase() +
            outfit.occasion_fit.slice(1)}
        </Text>
      </View>

      {/* Outfit name */}
      <Text style={styles.outfitName}>{outfit.outfit_name}</Text>

      {/* Item thumbnails */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailRow}
      >
        {outfitItems.length > 0 ? (
          outfitItems.map((item) => (
            <View key={item.id} style={styles.thumbnailContainer}>
              <Image
                source={{ uri: item.thumbnail_url ?? item.image_url }}
                style={styles.thumbnail}
              />
              <Text style={styles.thumbnailLabel} numberOfLines={1}>
                {item.suggested_name || item.category}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.noItemsContainer}>
            <Text style={styles.noItemsText}>Items not available</Text>
          </View>
        )}
      </ScrollView>

      {/* AI styling tip */}
      <View style={styles.stylingTipContainer}>
        <Text style={styles.stylingTipLabel}>AI-suggested outfit</Text>
        <Text style={styles.stylingTipText}>{outfit.styling_tip}</Text>
      </View>

      {/* Confidence indicator */}
      <View style={styles.confidenceContainer}>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              { width: `${Math.round(outfit.confidence * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.confidenceText}>
          {Math.round(outfit.confidence * 100)}% match
        </Text>
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={() => onSave(outfit, outfitItems)}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? "Saving..." : "Save Outfit"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// MAIN SCREEN COMPONENT
// ============================================================

export default function MagicBarScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [allItems, setAllItems] = useState<OutfitItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingOutfitId, setSavingOutfitId] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const inputRef = useRef<TextInput>(null);

  // Rotate placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % INPUT_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // CLAUDE API CALL
  // ============================================================

  async function callClaudeAPI(
    userQuery: string,
    items: OutfitItem[],
  ): Promise<OutfitSuggestion[]> {
    const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Claude API key not configured. Set EXPO_PUBLIC_CLAUDE_API_KEY in .env",
      );
    }

    const systemPrompt = `You are Prompt Closet's AI stylist. You create outfit combinations from a user's wardrobe. Always suggest complete outfits (at minimum: top + bottom OR a dress). Consider the occasion, weather context, and cultural appropriateness. For Indian occasions, apply appropriate formality and coverage norms.`;

    const itemsList = items
      .map(
        (item) =>
          `- ID: ${item.id} | ${item.suggested_name || item.category} | Occasions: ${item.occasions.join(", ")} | Formality: ${item.formality_score}/5`,
      )
      .join("\n");

    const userMessage = `User request: ${userQuery}\n\nAvailable wardrobe items (top matches):\n${itemsList}\n\nReturn a JSON array of 2-3 outfit suggestions. Each suggestion:\n{\n  "outfit_name": string,\n  "item_ids": string[],\n  "occasion_fit": string,\n  "styling_tip": string,\n  "confidence": number\n}\nReturn ONLY the JSON array, no other text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from Claude API");
    }

    // Parse JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse outfit suggestions from response");
    }

    const suggestions = JSON.parse(jsonMatch[0]) as OutfitSuggestion[];
    return suggestions;
  }

  // ============================================================
  // FETCH ITEM DETAILS
  // ============================================================

  async function fetchItemDetails(itemIds: string[]): Promise<OutfitItem[]> {
    if (itemIds.length === 0) return [];

    const { data, error: itemsError } = await supabase
      .from("wardrobe_items")
      .select(
        "id, image_url, thumbnail_url, category, colors, occasions, formality_score, ai_tags",
      )
      .in("id", itemIds)
      .eq("user_id", user?.id)
      .eq("is_active", true);

    if (itemsError) {
      console.error("[MagicBar] Failed to fetch items:", itemsError);
      return [];
    }

    // Extract suggested_name from ai_tags if available
    return (data || []).map((item) => ({
      id: item.id,
      image_url: item.image_url,
      thumbnail_url: item.thumbnail_url,
      suggested_name:
        ((item.ai_tags as Record<string, unknown>)?.suggested_name as string) ||
        item.category,
      category: item.category,
      colors: item.colors || [],
      occasions: item.occasions || [],
      formality_score: item.formality_score || 3,
    }));
  }

  // ============================================================
  // HANDLE SEARCH
  // ============================================================

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed || !user) return;

    setLoading(true);
    setError(null);
    setOutfits([]);
    setAllItems([]);
    setHasSearched(true);

    try {
      // Step 1: Semantic search for top 20 matching items
      const searchResults = await semanticSearch(user.id, trimmed, 20);

      if (searchResults.length === 0) {
        setError(
          "I couldn't find anything in your closet for this. Try adding more items, or rephrase your request.",
        );
        setLoading(false);
        return;
      }

      // Step 2: Map search results to OutfitItem format
      const matchedItems: OutfitItem[] = searchResults
        .filter((r: SearchResult) => r.item != null)
        .map((r: SearchResult) => {
          const item = r.item!;
          return {
            id: item.id,
            image_url: item.image_url,
            thumbnail_url: item.thumbnail_url,
            suggested_name: item.suggested_name || item.category,
            category: item.category,
            colors: item.colors || [],
            occasions: item.occasions || [],
            formality_score: item.formality_score || 3,
          };
        });

      if (matchedItems.length === 0) {
        setError(
          "I couldn't find anything in your closet for this. Try adding more items, or rephrase your request.",
        );
        setLoading(false);
        return;
      }

      setAllItems(matchedItems);

      // Step 3: Call Claude API to get outfit suggestions
      const suggestions = await callClaudeAPI(trimmed, matchedItems);
      setOutfits(suggestions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[MagicBar] Search error:", message);
      setError(`Something went wrong: ${message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // HANDLE SAVE OUTFIT
  // ============================================================

  async function handleSaveOutfit(
    outfit: OutfitSuggestion,
    items: OutfitItem[],
  ) {
    if (!user) return;

    setSavingOutfitId(outfit.outfit_name);

    try {
      const { error: saveError } = await supabase.from("outfits").insert({
        user_id: user.id,
        name: outfit.outfit_name,
        item_ids: outfit.item_ids,
        occasion: outfit.occasion_fit,
        notes: outfit.styling_tip,
        ai_generated: true,
      });

      if (saveError) throw saveError;

      Alert.alert(
        "Outfit Saved!",
        `"${outfit.outfit_name}" has been added to your Style collection.`,
        [{ text: "OK" }],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Save Failed", `Could not save outfit: ${message}`);
    } finally {
      setSavingOutfitId(null);
    }
  }

  // ============================================================
  // HANDLE QUICK PROMPT
  // ============================================================

  function handleQuickPrompt(prompt: string) {
    setQuery(prompt);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Large serif heading */}
        <Text style={styles.heading}>What do you want to wear?</Text>

        {/* Offline Banner */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerIcon}>📵</Text>
            <Text style={styles.offlineBannerText}>
              Magic Bar requires an internet connection to style your outfits.
            </Text>
          </View>
        )}

        {/* Text input */}
        <View style={styles.inputSection}>
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder={INPUT_PLACEHOLDERS[placeholderIndex]}
              placeholderTextColor="#A0978E"
              multiline
              autoFocus
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>

          {/* Style Me button */}
          <TouchableOpacity
            style={[
              styles.styleButton,
              (loading || !isConnected) && styles.styleButtonDisabled,
            ]}
            onPress={handleSearch}
            disabled={loading || !query.trim() || !isConnected}
          >
            <Text style={styles.styleButtonText}>Style Me</Text>
          </TouchableOpacity>
        </View>

        {/* Quick prompt chips */}
        {!hasSearched && (
          <View style={styles.quickSection}>
            <Text style={styles.quickLabel}>Try saying...</Text>
            <View style={styles.chipRow}>
              {QUICK_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.chip}
                  onPress={() => handleQuickPrompt(prompt)}
                >
                  <Text style={styles.chipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Loading state */}
        {loading && <LoadingState />}

        {/* Error state */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>hmm...</Text>
            <Text style={styles.errorText}>{error}</Text>
            {error.includes("closet") && (
              <TouchableOpacity
                style={styles.addItemsButton}
                onPress={() => navigation.navigate("AddItem")}
              >
                <Text style={styles.addItemsButtonText}>
                  Add items to closet
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results - Outfit cards */}
        {!loading && outfits.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsLabel}>
              {outfits.length} outfit{outfits.length !== 1 ? "s" : ""} for you
            </Text>
            {outfits.map((outfit, index) => (
              <OutfitCard
                key={`${outfit.outfit_name}-${index}`}
                outfit={outfit}
                items={allItems}
                onSave={handleSaveOutfit}
                saving={savingOutfitId === outfit.outfit_name}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  offlineBanner: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 12,
  },
  offlineBannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  offlineBannerText: {
    fontSize: 14,
    color: "#2C2C2C",
    fontWeight: "500",
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    paddingVertical: 6,
    width: 60,
  },
  backBtnText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 24,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  inputSection: {
    marginBottom: 24,
  },
  inputWrap: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 14,
    minHeight: 100,
  },
  input: {
    fontSize: 16,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  styleButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  styleButtonDisabled: {
    opacity: 0.6,
  },
  styleButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  quickSection: {
    marginBottom: 24,
  },
  quickLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  // Loading state styles
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  shimmerContainer: {
    width: "100%",
    maxWidth: 340,
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingHeader: {
    marginBottom: 16,
  },
  shimmerLineMedium: {
    height: 20,
    width: "60%",
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
  loadingThumbnails: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  loadingThumb: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.border,
    borderRadius: 8,
  },
  loadingFooter: {
    gap: 8,
  },
  shimmerLineShort: {
    height: 14,
    width: "40%",
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
  shimmerLineLong: {
    height: 14,
    width: "85%",
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginTop: 8,
  },
  // Error state styles
  errorContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  addItemsButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addItemsButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  // Results section
  resultsSection: {
    marginTop: 8,
  },
  resultsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Outfit card styles
  outfitCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  occasionBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  occasionBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  outfitName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },
  thumbnailContainer: {
    alignItems: "center",
    width: 80,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  thumbnailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: "center",
    width: 76,
  },
  noItemsContainer: {
    height: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  noItemsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  stylingTipContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stylingTipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stylingTipText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
