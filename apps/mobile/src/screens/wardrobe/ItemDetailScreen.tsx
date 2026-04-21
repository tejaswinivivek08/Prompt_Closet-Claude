import React from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase, deleteItem } from "../../lib/supabase";

const SCREEN_WIDTH = Dimensions.get("window").width;

const COLORS = {
  background: "#F5F0EA",
  card: "#FFFFFF",
  text: "#2C2C2C",
  textSecondary: "#7A6F68",
  primary: "#C9847A",
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

interface RouteParams {
  itemId: string;
  imageUrl: string;
}

interface ItemDetailScreenProps {
  navigation: any;
  route: { params: RouteParams };
}

export default function ItemDetailScreen({
  navigation,
  route,
}: ItemDetailScreenProps) {
  const { itemId, imageUrl } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [item, setItem] = React.useState<any>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    async function fetchItem() {
      const { data } = await supabase
        .from("wardrobe_items")
        .select("*")
        .eq("id", itemId)
        .single();
      setItem(data);
      setLoading(false);
    }
    fetchItem();
  }, [itemId]);

  const handleDelete = async () => {
    if (!user) return;

    Alert.alert("Delete this item?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          const { error } = await deleteItem(itemId, user.id);
          setDeleting(false);
          if (error) {
            Alert.alert("Failed to delete item", error.message);
          } else {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Full-screen image */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Item details card */}
        <View style={styles.detailsCard}>
          <Text style={styles.itemName}>
            {item.suggested_name ||
              `${(item.colors?.[0] ?? "").charAt(0).toUpperCase()}${(item.colors?.[0] ?? "").slice(1)} ${item.category}`}
          </Text>

          {item.subcategory && (
            <Text style={styles.subcategory}>{item.subcategory}</Text>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoChip}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
            {item.formality_score && (
              <View style={styles.infoChip}>
                <Text style={styles.infoLabel}>Formality</Text>
                <Text style={styles.infoValue}>
                  {"★".repeat(item.formality_score)}
                  {"☆".repeat(5 - item.formality_score)}
                </Text>
              </View>
            )}
          </View>

          {item.colors && item.colors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Colors</Text>
              <View style={styles.colorRow}>
                {item.colors.map((color: string) => (
                  <View
                    key={color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: getColorCode(color) },
                    ]}
                  />
                ))}
                <Text style={styles.colorText}>{item.colors.join(", ")}</Text>
              </View>
            </View>
          )}

          {item.pattern && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Pattern</Text>
              <Text style={styles.sectionValue}>
                {item.pattern.charAt(0).toUpperCase() + item.pattern.slice(1)}
              </Text>
            </View>
          )}

          {item.occasions && item.occasions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Occasions</Text>
              <View style={styles.occasionRow}>
                {item.occasions.map((occ: string) => (
                  <View
                    key={occ}
                    style={[
                      styles.occasionPill,
                      {
                        backgroundColor:
                          COLORS.occasion[occ.toLowerCase()] ??
                          COLORS.occasion.casual,
                      },
                    ]}
                  >
                    <Text style={styles.occasionText}>
                      {occ.charAt(0).toUpperCase() + occ.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {item.fabric && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Fabric</Text>
              <Text style={styles.sectionValue}>
                {item.fabric.charAt(0).toUpperCase() + item.fabric.slice(1)}
              </Text>
            </View>
          )}

          {item.style_notes && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Style Notes</Text>
              <Text style={styles.styleNotes}>{item.style_notes}</Text>
            </View>
          )}

          {item.wear_count !== undefined && item.wear_count > 0 && (
            <Text style={styles.wornCount}>Worn {item.wear_count} times</Text>
          )}

          <TouchableOpacity
            style={styles.editTagsButton}
            onPress={() => navigation.navigate("EditItem", { itemId: item.id })}
          >
            <Text style={styles.editTagsButtonText}>Edit Tags</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteButtonText}>🗑️ Delete Item</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {deleting && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      {/* Back button overlay */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function getColorCode(colorName: string): string {
  const colorMap: Record<string, string> = {
    navy: "#1a237e",
    black: "#1a1a1a",
    white: "#f5f5f5",
    red: "#c62828",
    blue: "#1565c0",
    green: "#2e7d32",
    yellow: "#f9a825",
    orange: "#ef6c00",
    pink: "#ec407a",
    purple: "#7b1fa2",
    brown: "#4e342e",
    grey: "#616161",
    gray: "#616161",
    cream: "#fffdd0",
    beige: "#f5f5dc",
    maroon: "#800000",
    olive: "#808000",
    coral: "#ff7f50",
    burgundy: "#800020",
    gold: "#ffd700",
    silver: "#c0c0c0",
  };
  return (
    colorMap[colorName.toLowerCase()] ??
    "#" + ((0xffffff * Math.random()) | 0).toString(16).padStart(6, "0")
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.3,
    backgroundColor: "#000",
  },
  detailsCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 24,
    paddingBottom: 40,
  },
  itemName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  subcategory: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  infoChip: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorText: {
    fontSize: 14,
    color: COLORS.text,
  },
  occasionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  occasionPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  occasionText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  styleNotes: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: "italic",
  },
  wornCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: "#E53935",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  editTagsButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  editTagsButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "300",
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
