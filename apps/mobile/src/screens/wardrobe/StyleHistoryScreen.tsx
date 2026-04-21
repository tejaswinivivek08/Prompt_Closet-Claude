import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  SectionList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

// ============================================================
// TYPES
// ============================================================

interface OutfitItem {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  suggested_name: string;
  category: string;
}

interface Outfit {
  id: string;
  name: string | null;
  item_ids: string[];
  occasion: string | null;
  notes: string | null;
  created_at: string;
  items?: OutfitItem[];
}

type DateGroup = "Today" | "Yesterday" | "This Week" | "Earlier";

interface Section {
  title: DateGroup;
  data: Outfit[];
}

// ============================================================
// DESIGN TOKENS
// ============================================================

const COLORS = {
  background: "#F5F0EA",
  card: "#FFFFFF",
  cardShadow: "rgba(0,0,0,0.06)",
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

const OCCASION_COLORS: Record<string, string> = {
  casual: COLORS.occasion.casual,
  office: COLORS.occasion.office,
  festive: COLORS.occasion.festive,
  wedding: COLORS.occasion.wedding,
  party: COLORS.occasion.party,
  temple: COLORS.occasion.temple,
  beach: COLORS.occasion.beach,
  date: COLORS.occasion.date,
  sport: COLORS.occasion.sport,
};

// ============================================================
// HELPERS
// ============================================================

const SCREEN_WIDTH = Dimensions.get("window").width;
const THUMB_SIZE = (SCREEN_WIDTH - 32 - 24) / 4; // 4 per row with padding & gaps

function getOccasionColor(occasion: string): string {
  return OCCASION_COLORS[occasion.toLowerCase()] ?? COLORS.primary;
}

function getDateGroup(createdAt: string): DateGroup {
  const now = new Date();
  const created = new Date(createdAt);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

  if (created >= todayStart) return "Today";
  if (created >= yesterdayStart) return "Yesterday";
  if (created >= weekStart) return "This Week";
  return "Earlier";
}

function formatDate(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

// ============================================================
// OUTFIT CARD
// ============================================================

interface OutfitCardProps {
  outfit: Outfit;
  onPress?: () => void;
}

function OutfitCard({ outfit, onPress }: OutfitCardProps) {
  const occasionColor = outfit.occasion
    ? getOccasionColor(outfit.occasion)
    : COLORS.primary;

  const displayName = outfit.name ?? "Untitled Outfit";
  const displayDate = formatDate(outfit.created_at);

  const thumbnails = (outfit.items ?? []).slice(0, 4);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Thumbnails row */}
      <View style={styles.thumbnailRow}>
        {thumbnails.length > 0 ? (
          thumbnails.map((item) => (
            <View key={item.id} style={styles.thumbContainer}>
              <Image
                source={{ uri: item.thumbnail_url ?? item.image_url }}
                style={styles.thumbImage}
                resizeMode="cover"
              />
            </View>
          ))
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbPlaceholderText}>No items</Text>
          </View>
        )}
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.outfitName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.outfitDate}>{displayDate}</Text>
        </View>

        {/* Occasion badge */}
        {outfit.occasion && (
          <View
            style={[
              styles.occasionBadge,
              { backgroundColor: occasionColor + "20" },
            ]}
          >
            <Text style={[styles.occasionBadgeText, { color: occasionColor }]}>
              {outfit.occasion.charAt(0).toUpperCase() +
                outfit.occasion.slice(1)}
            </Text>
          </View>
        )}

        {/* AI styling tip */}
        {outfit.notes && (
          <View style={styles.tipContainer}>
            <Text style={styles.tipLabel}>AI tip</Text>
            <Text style={styles.tipText} numberOfLines={2}>
              {outfit.notes}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>👗</Text>
      <Text style={styles.emptyTitle}>No saved outfits yet</Text>
      <Text style={styles.emptySubtitle}>
        Use the Magic Bar to get AI styling suggestions!
      </Text>
    </View>
  );
}

// ============================================================
// SKELETON
// ============================================================

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.thumbnailRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.thumbContainer, styles.skeletonThumb]} />
        ))}
      </View>
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: "60%" }]} />
        <View style={[styles.skeletonLine, { width: "40%", marginTop: 6 }]} />
      </View>
    </View>
  );
}

// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({ title }: { title: DateGroup }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

interface StyleHistoryScreenProps {
  navigation: any;
}

export default function StyleHistoryScreen({
  navigation,
}: StyleHistoryScreenProps) {
  const { user } = useAuth();

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOutfits = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("outfits")
      .select("id, name, item_ids, occasion, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[StyleHistory] Fetch error:", error.message);
      setLoading(false);
      return;
    }

    const outfitsData = (data ?? []) as Outfit[];

    // Fetch item details for each outfit
    const allItemIds = [...new Set(outfitsData.flatMap((o) => o.item_ids))];
    if (allItemIds.length === 0) {
      setOutfits(outfitsData);
      return;
    }

    const { data: itemsData } = await supabase
      .from("wardrobe_items")
      .select("id, image_url, thumbnail_url, ai_tags, category")
      .in("id", allItemIds)
      .eq("user_id", user.id)
      .eq("is_active", true);

    const itemMap = new Map<string, OutfitItem>();
    (itemsData ?? []).forEach((item) => {
      itemMap.set(item.id, {
        id: item.id,
        image_url: item.image_url,
        thumbnail_url: item.thumbnail_url,
        suggested_name:
          ((item.ai_tags as Record<string, unknown>)
            ?.suggested_name as string) ?? item.category,
        category: item.category,
      });
    });

    const outfitsWithItems = outfitsData.map((outfit) => ({
      ...outfit,
      items: outfit.item_ids
        .map((id) => itemMap.get(id))
        .filter((item): item is OutfitItem => item != null),
    }));

    setOutfits(outfitsWithItems);
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchOutfits().finally(() => setLoading(false));
    }
  }, [user, fetchOutfits]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchOutfits();
    setRefreshing(false);
  }, [user, fetchOutfits]);

  // Group outfits by date
  const sections: Section[] = React.useMemo(() => {
    const groups: Record<DateGroup, Outfit[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Earlier: [],
    };

    outfits.forEach((outfit) => {
      const group = getDateGroup(outfit.created_at);
      groups[group].push(outfit);
    });

    return (["Today", "Yesterday", "This Week", "Earlier"] as DateGroup[])
      .map((title) => ({ title, data: groups[title] }))
      .filter((section) => section.data.length > 0);
  }, [outfits]);

  const renderItem = useCallback(
    ({ item }: { item: Outfit }) => (
      <View style={styles.cardWrapper}>
        <OutfitCard outfit={item} />
      </View>
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <SectionHeader title={section.title} />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Style History</Text>
        <TouchableOpacity
          style={styles.styleDnaButton}
          onPress={() => navigation.navigate("StyleDNA")}
        >
          <Text style={styles.styleDnaButtonText}>Style DNA</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.cardWrapper}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : outfits.length === 0 ? (
        <EmptyState />
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListFooterComponent={<View style={styles.listFooter} />}
        />
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  styleDnaButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  styleDnaButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listFooter: {
    height: 24,
  },
  skeletonList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 6,
  },
  thumbContainer: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#E8E0D8",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    backgroundColor: "#E8E0D8",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbPlaceholderText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  cardBody: {
    padding: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  outfitName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  outfitDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  occasionBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  occasionBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tipContainer: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tipLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  skeletonThumb: {
    backgroundColor: "#E8E0D8",
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#E8E0D8",
    borderRadius: 4,
    marginTop: 4,
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
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
});
