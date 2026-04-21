import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../contexts/AuthContext";
import { supabase, deleteItem } from "../../lib/supabase";
import { semanticSearch } from "../../services/embeddingService";
import type { SearchResult } from "../../services/embeddingService";

// ============================================================
// TYPES
// ============================================================

interface WardrobeItem {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  category: string;
  subcategory: string | null;
  colors: string[];
  pattern: string;
  occasions: string[];
  formality_score: number;
  suggested_name?: string;
  wear_count: number;
  created_at: string;
}

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
  occasion: {
    casual: "#7B9E87",
    office: "#4A7B9D",
    festive: "#C9A96E",
    wedding: "#C9A96E",
    party: "#B5A0C9",
    temple: "#C9847A",
    beach: "#5BA8C4",
    date: "#D4847C",
    sport: "#6B8E6B",
  } as Record<string, string>,
};

const CARD_GAP = 4;
const NUM_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT = 5;

// ============================================================
// HELPERS
// ============================================================

function getItemLayout(_: any, index: number) {
  const row = Math.floor(index / NUM_COLUMNS);
  return {
    length: CARD_WIDTH * 1.25 + CARD_GAP,
    offset: (CARD_WIDTH * 1.25 + CARD_GAP) * row,
    index,
  };
}

function getOccasionColor(occasion: string): string {
  return COLORS.occasion[occasion.toLowerCase()] ?? COLORS.occasion.casual;
}

function getDisplayName(item: WardrobeItem): string {
  if (item.suggested_name) return item.suggested_name;
  if (item.subcategory) {
    const color = item.colors[0] ?? "";
    return `${color.charAt(0).toUpperCase() + color.slice(1)} ${item.subcategory.charAt(0).toUpperCase() + item.subcategory.slice(1)}`;
  }
  return `${item.colors[0] ?? ""} ${item.category}`.trim() || "Unnamed Item";
}

// ============================================================
// ITEM CARD
// ============================================================

interface ItemCardProps {
  item: WardrobeItem;
  similarity?: number;
  onPress: () => void;
  onLongPress: () => void;
}

function ItemCard({ item, similarity, onPress, onLongPress }: ItemCardProps) {
  const displayName = getDisplayName(item);
  const topOccasions = item.occasions.slice(0, 2);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.thumbnail_url ?? item.image_url }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      {similarity !== undefined && (
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{Math.round(similarity * 100)}%</Text>
        </View>
      )}
      <View style={styles.cardOverlay}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.occasionRow}>
            {topOccasions.map((occ) => (
              <View
                key={occ}
                style={[
                  styles.occasionPill,
                  { backgroundColor: getOccasionColor(occ) },
                ]}
              >
                <Text style={styles.occasionText}>{occ}</Text>
              </View>
            ))}
          </View>
          {item.wear_count > 0 && (
            <Text style={styles.wornLabel}>Worn {item.wear_count}x</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

interface SearchScreenProps {
  navigation: any;
}

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches
  useEffect(() => {
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((val) => {
        if (val) setRecentSearches(JSON.parse(val));
      })
      .catch(() => {});
  }, []);

  // Save a search to recent
  const saveRecentSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const updated = [
        trimmed,
        ...recentSearches.filter((s) => s !== trimmed),
      ].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      try {
        await AsyncStorage.setItem(
          RECENT_SEARCHES_KEY,
          JSON.stringify(updated),
        );
      } catch {}
    },
    [recentSearches],
  );

  // Clear a single recent search
  const clearRecentSearch = useCallback(
    async (q: string) => {
      const updated = recentSearches.filter((s) => s !== q);
      setRecentSearches(updated);
      try {
        await AsyncStorage.setItem(
          RECENT_SEARCHES_KEY,
          JSON.stringify(updated),
        );
      } catch {}
    },
    [recentSearches],
  );

  // Clear all recent searches
  const clearAllRecent = useCallback(async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  }, []);

  // Run search
  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || !user) return;

      setSearchLoading(true);
      try {
        const results = await semanticSearch(user.id, trimmed, 20, 0.3);
        setSearchResults(results);
        if (results.length > 0) {
          saveRecentSearch(trimmed);
        }
      } catch (err) {
        console.error("[SearchScreen] Search error:", err);
        Alert.alert("Search failed", "Please try again.");
      } finally {
        setSearchLoading(false);
      }
    },
    [user, saveRecentSearch],
  );

  const handleQueryChange = useCallback((v: string) => {
    setSearchQuery(v);
    if (!v.trim()) {
      setSearchResults(null);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    runSearch(searchQuery);
  }, [searchQuery, runSearch]);

  const handleRecentPress = useCallback(
    (q: string) => {
      setSearchQuery(q);
      runSearch(q);
    },
    [runSearch],
  );

  // Build list data from search results
  const listData = searchResults ?? [];
  const hasQuery = searchQuery.trim().length > 0;

  const renderItem = useCallback(
    ({ item, index }: { item: SearchResult; index: number }) => {
      const wardrobeItem = item.item;
      if (!wardrobeItem) return null;

      const handleLongPress = () => {
        Alert.alert(`Delete?`, "This cannot be undone.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              if (!user) return;
              const { error } = await deleteItem(wardrobeItem.id, user.id);
              if (error) {
                Alert.alert("Failed to delete item", error.message);
                return;
              }
              setSearchResults((prev) =>
                prev ? prev.filter((r) => r.item_id !== wardrobeItem.id) : null,
              );
            },
          },
        ]);
      };

      return (
        <View
          style={{
            width: CARD_WIDTH,
            marginLeft: index % NUM_COLUMNS === 0 ? CARD_GAP : CARD_GAP / 2,
            marginRight: CARD_GAP / 2,
          }}
        >
          <ItemCard
            item={wardrobeItem as WardrobeItem}
            similarity={item.similarity}
            onPress={() =>
              navigation.navigate("ItemDetail", {
                itemId: wardrobeItem.id,
                imageUrl: wardrobeItem.image_url,
              })
            }
            onLongPress={handleLongPress}
          />
        </View>
      );
    },
    [navigation, user],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Large heading */}
      <View style={styles.headingSection}>
        <Text style={styles.heading}>Search</Text>
        <Text style={styles.subheading}>Find anything in your closet</Text>
      </View>

      {/* Search input */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleQueryChange}
            placeholder="Describe what you're looking for..."
            placeholderTextColor="#A0978E"
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoFocus={false}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchLoading && (
            <ActivityIndicator size="small" color={COLORS.primary} />
          )}
          {searchQuery.length > 0 && !searchLoading && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              style={{ marginLeft: 4 }}
            >
              <Text style={{ fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Recent searches — shown when no query */}
      {!hasQuery && recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent</Text>
            <TouchableOpacity onPress={clearAllRecent}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentChips}>
            {recentSearches.map((q) => (
              <View key={q} style={styles.recentChipWrap}>
                <TouchableOpacity
                  style={styles.recentChip}
                  onPress={() => handleRecentPress(q)}
                >
                  <Text style={styles.recentChipText}>{q}</Text>
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => clearRecentSearch(q)}
                  >
                    <Text style={styles.recentChipClear}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty state — no query, no recent */}
      {!hasQuery && recentSearches.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Search your closet</Text>
          <Text style={styles.emptySubtitle}>
            Describe what you're looking for —{"\n"}colors, style, occasion, or
            event
          </Text>
        </View>
      )}

      {/* Loading skeletons */}
      {hasQuery && searchLoading && (
        <View style={styles.gridContainer}>
          <View style={styles.loadingGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: CARD_WIDTH,
                  marginLeft: i % NUM_COLUMNS === 0 ? CARD_GAP : CARD_GAP / 2,
                  marginRight: CARD_GAP / 2,
                }}
              >
                <View style={styles.skeletonCard}>
                  <View style={styles.skeletonImage} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Results grid */}
      {hasQuery && !searchLoading && listData.length > 0 && (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => item.item_id}
          numColumns={NUM_COLUMNS}
          key={NUM_COLUMNS}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* No results */}
      {hasQuery && !searchLoading && listData.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>😕</Text>
          <Text style={styles.emptyTitle}>No items found</Text>
          <Text style={styles.emptySubtitle}>
            Try different words or add more items to your closet
          </Text>
        </View>
      )}
    </SafeAreaView>
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
  headingSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  heading: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 0,
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  recentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentChipWrap: {},
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 8,
  },
  recentChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  recentChipClear: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: CARD_GAP / 2,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: "flex-start",
  },
  loadingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: CARD_GAP / 2,
    paddingTop: 8,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    aspectRatio: "4 / 5",
    borderRadius: 8,
    marginVertical: CARD_GAP / 2,
    overflow: "hidden",
  },
  skeletonImage: {
    flex: 1,
    backgroundColor: "#E8E0D8",
    borderRadius: 8,
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: "4 / 5",
    backgroundColor: COLORS.card,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    marginVertical: CARD_GAP / 2,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8E0D8",
  },
  cardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 6,
  },
  cardInfo: {},
  cardName: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  occasionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    marginBottom: 2,
  },
  occasionPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  occasionText: {
    fontSize: 9,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  wornLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  matchBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  matchText: {
    fontSize: 9,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
