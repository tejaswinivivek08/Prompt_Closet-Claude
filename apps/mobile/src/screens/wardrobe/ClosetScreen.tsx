import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { useNetwork } from "../../contexts/NetworkContext";
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

type CategoryFilter =
  | "All"
  | "top"
  | "bottom"
  | "dress"
  | "traditional"
  | "outerwear"
  | "footwear"
  | "accessory";

const CATEGORY_FILTERS: CategoryFilter[] = [
  "All",
  "top",
  "bottom",
  "dress",
  "traditional",
  "outerwear",
  "footwear",
  "accessory",
];

// ============================================================
// DESIGN TOKENS
// ============================================================

const COLORS = {
  background: "#F5F0EA",
  card: "#FFFFFF",
  cardShadow: "rgba(0,0,0,0.06)",
  primary: "#C9847A", // rose gold
  text: "#2C2C2C",
  textSecondary: "#7A6F68",
  border: "#E5DDD5",
  occasion: {
    casual: "#7B9E87", // sage green
    office: "#4A7B9D", // steel blue
    festive: "#C9A96E", // gold
    wedding: "#C9A96E", // gold
    party: "#B5A0C9", // dusty lilac
    temple: "#C9847A", // rose gold
    beach: "#5BA8C4",
    date: "#D4847C",
    sport: "#6B8E6B",
  } as Record<string, string>,
};

// ============================================================
// HELPERS
// ============================================================

const CARD_GAP = 4;
const NUM_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

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

const PAGE_SIZE = 24;

// ============================================================
// SKELETON
// ============================================================

function SkeletonCard() {
  return (
    <View style={[styles.card, styles.cardSkeleton]}>
      <View
        style={[styles.cardSkeletonImage, { backgroundColor: "#E8E0D8" }]}
      />
      <View style={{ padding: 6 }}>
        <View
          style={{
            height: 10,
            backgroundColor: "#E8E0D8",
            borderRadius: 4,
            marginBottom: 4,
          }}
        />
        <View
          style={{
            height: 8,
            width: "60%",
            backgroundColor: "#E8E0D8",
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
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
// CATEGORY FILTER BAR
// ============================================================

interface FilterBarProps {
  selected: CategoryFilter;
  onSelect: (cat: CategoryFilter) => void;
}

function FilterBar({ selected, onSelect }: FilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
    >
      {CATEGORY_FILTERS.map((cat) => {
        const isActive = cat === selected;
        return (
          <TouchableOpacity
            key={cat}
            style={[styles.filterPill, isActive && styles.filterPillActive]}
            onPress={() => onSelect(cat)}
          >
            <Text
              style={[
                styles.filterPillText,
                isActive && styles.filterPillTextActive,
              ]}
            >
              {cat === "All"
                ? "All"
                : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ============================================================
// SEARCH BAR
// ============================================================

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onAIButtonPress: () => void;
}

function SearchBar({
  value,
  onChange,
  onSubmit,
  loading,
  onAIButtonPress,
}: SearchBarProps) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChange}
          placeholder="Find something to wear..."
          placeholderTextColor="#A0978E"
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          editable={!loading}
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={{ marginRight: 8 }}
          />
        )}
      </View>
      <TouchableOpacity style={styles.aiButton} onPress={onAIButtonPress}>
        <Text style={styles.aiButtonText}>✨ Ask AI Stylist</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{isSearching ? "🔍" : "👗"}</Text>
      <Text style={styles.emptyTitle}>
        {isSearching ? "No items found" : "Your closet is empty"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isSearching
          ? "Try a different search or browse all items"
          : "Tap + to add your first clothing item"}
      </Text>
    </View>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

interface ClosetScreenProps {
  navigation: any;
}

export default function ClosetScreen({ navigation }: ClosetScreenProps) {
  const { user } = useAuth();
  const { isConnected } = useNetwork();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Fetch items from Supabase
  const fetchItems = useCallback(
    async (pageNum: number = 0, append = false) => {
      if (!user) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("wardrobe_items")
        .select(
          "id, image_url, thumbnail_url, category, subcategory, colors, pattern, occasions, formality_score, suggested_name, wear_count, created_at",
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("[ClosetScreen] Fetch error:", error.message);
        return;
      }

      const newItems = (data ?? []) as WardrobeItem[];

      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setHasMore(newItems.length === PAGE_SIZE);
    },
    [user],
  );

  // Initial load
  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchItems(0, false).finally(() => setLoading(false));
    }
  }, [user, fetchItems]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    setPage(0);
    setSearchResults(null);
    setSearchQuery("");
    await fetchItems(0, false);
    setRefreshing(false);
  }, [user, fetchItems]);

  // Load more (pagination)
  const onEndReached = useCallback(() => {
    if (hasMore && !loading && !searchLoading && !searchResults) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchItems(nextPage, true);
    }
  }, [hasMore, loading, searchLoading, searchResults, page, fetchItems]);

  // Semantic search
  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query || !user) return;

    setSearchLoading(true);
    try {
      const results = await semanticSearch(user.id, query, 20, 0.3);
      setSearchResults(results);
    } catch (err) {
      console.error("[ClosetScreen] Search error:", err);
      Alert.alert("Search failed", "Please try again.");
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, user]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
  }, []);

  // Filter items locally
  const filteredItems = React.useMemo(() => {
    if (selectedFilter === "All") return items;
    return items.filter((item) => item.category === selectedFilter);
  }, [items, selectedFilter]);

  // Build list data
  const listData = searchResults
    ? filteredItems.filter((item) =>
        searchResults.some((r) => r.item_id === item.id),
      )
    : filteredItems;

  const isSearching = searchResults !== null || searchQuery.trim().length > 0;

  const renderItem = useCallback(
    ({ item, index }: { item: WardrobeItem; index: number }) => {
      const searchResult = searchResults?.find((r) => r.item_id === item.id);
      const displayName = getDisplayName(item);

      const handleLongPress = () => {
        Alert.alert(`Delete ${displayName}?`, "This cannot be undone.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              if (!user) return;
              const { error } = await deleteItem(item.id, user.id);
              if (error) {
                Alert.alert("Failed to delete item", error.message);
                return;
              }
              // Remove from local list
              setItems((prev) => prev.filter((i) => i.id !== item.id));
              if (searchResults) {
                setSearchResults((prev) =>
                  prev ? prev.filter((r) => r.item_id !== item.id) : null,
                );
              }
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
            item={item}
            similarity={searchResult?.similarity}
            onPress={() =>
              navigation.navigate("ItemDetail", {
                itemId: item.id,
                imageUrl: item.image_url,
              })
            }
            onLongPress={handleLongPress}
          />
        </View>
      );
    },
    [searchResults, navigation, user],
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 9 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: CARD_WIDTH,
            marginLeft: i % NUM_COLUMNS === 0 ? CARD_GAP : CARD_GAP / 2,
            marginRight: CARD_GAP / 2,
          }}
        >
          <SkeletonCard />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Closet</Text>
      </View>

      {/* Offline Banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerIcon}>📵</Text>
          <Text style={styles.offlineBannerText}>
            You're offline. Showing cached data.
          </Text>
        </View>
      )}

      {/* Search + AI Button */}
      <SearchBar
        value={searchQuery}
        onChange={(v) => {
          setSearchQuery(v);
          if (!v.trim()) handleClearSearch();
        }}
        onSubmit={handleSearch}
        loading={searchLoading}
        onAIButtonPress={() => navigation.navigate("MagicBar")}
      />

      {/* Category Filter */}
      {!isSearching && (
        <FilterBar selected={selectedFilter} onSelect={setSelectedFilter} />
      )}

      {/* Grid */}
      {loading ? (
        renderSkeleton()
      ) : listData.length === 0 ? (
        <EmptyState isSearching={isSearching && !searchLoading} />
      ) : (
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          key={NUM_COLUMNS}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && !searchResults ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddItem")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  offlineBanner: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  offlineBannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  offlineBannerText: {
    fontSize: 14,
    color: "#2C2C2C",
    fontWeight: "500",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  aiButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  aiButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  gridContent: {
    paddingHorizontal: CARD_GAP / 2,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: "flex-start",
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
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: CARD_GAP / 2,
  },
  cardSkeleton: {
    aspectRatio: "4 / 5",
    borderRadius: 8,
    marginVertical: CARD_GAP / 2,
  },
  cardSkeletonImage: {
    flex: 1,
    borderRadius: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 64,
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "300",
    marginTop: -2,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
