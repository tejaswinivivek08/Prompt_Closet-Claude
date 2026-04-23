import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { uploadWardrobeImage } from "../../services/storageService";
import type { ClothingCategory, Pattern, Occasion } from "../../types";
import type { ClothingTags } from "../../services/taggingService";
import {
  generateImageEmbedding,
  saveEmbedding,
} from "../../services/embeddingService";

const MAX_PHOTOS = 4;

interface ReviewTagsScreenProps {
  navigation: any;
  route: {
    params: {
      imageUrls: string[];
      tags: ClothingTags;
    };
  };
}

const CATEGORIES: ClothingCategory[] = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
  "accessory",
  "traditional",
];
const PATTERNS: Pattern[] = [
  "solid",
  "striped",
  "floral",
  "printed",
  "embroidered",
  "checkered",
];
const OCCASIONS: Occasion[] = [
  "casual",
  "office",
  "party",
  "festive",
  "wedding",
  "temple",
  "beach",
  "date",
];
const SEASONS = ["all-season", "summer", "winter", "monsoon"] as const;

// Color swatches for display
const COLOR_SWATCHES = [
  { name: "Red", hex: "#E53935" },
  { name: "Pink", hex: "#E91E63" },
  { name: "Coral", hex: "#FF7043" },
  { name: "Orange", hex: "#FF9800" },
  { name: "Yellow", hex: "#FDD835" },
  { name: "Green", hex: "#43A047" },
  { name: "Teal", hex: "#26A69A" },
  { name: "Navy", hex: "#1A237E" },
  { name: "Blue", hex: "#1E88E5" },
  { name: "Purple", hex: "#8E24AA" },
  { name: "Brown", hex: "#6D4C41" },
  { name: "Black", hex: "#212121" },
  { name: "White", hex: "#FAFAFA", border: true },
  { name: "Grey", hex: "#757575" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Beige", hex: "#D7CCC8" },
  { name: "Cream", hex: "#FFF8E1", border: true },
  { name: "Maroon", hex: "#880E4F" },
];

export default function ReviewTagsScreen({
  navigation,
  route,
}: ReviewTagsScreenProps) {
  const { imageUrls: initialUrls, tags: initialTags } = route.params;
  const { user } = useAuth();

  const [imageUrls, setImageUrls] = useState<string[]>(initialUrls);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [replacing, setReplacing] = useState(false);

  const [category, setCategory] = useState<ClothingCategory>(
    initialTags.category,
  );
  const [subcategory, setSubcategory] = useState(initialTags.subcategory ?? "");
  const [colors, setColors] = useState<string[]>(initialTags.colors);
  const [pattern, setPattern] = useState<Pattern>(initialTags.pattern);
  const [occasions, setOccasions] = useState<Occasion[]>(initialTags.occasions);
  const [formalityScore, setFormalityScore] = useState(
    initialTags.formality_score,
  );
  const [suggestedName, setSuggestedName] = useState(
    (initialTags as any).suggested_name ?? initialTags.suggested_name ?? "",
  );
  const [styleNotes, setStyleNotes] = useState(
    (initialTags as any).style_notes ?? initialTags.style_notes ?? "",
  );
  const [saving, setSaving] = useState(false);

  const toggleColor = (colorName: string) => {
    setColors((prev) =>
      prev.includes(colorName)
        ? prev.filter((c) => c !== colorName)
        : [...prev, colorName],
    );
  };

  const toggleOccasion = (occasion: Occasion) => {
    setOccasions((prev) =>
      prev.includes(occasion)
        ? prev.filter((o) => o !== occasion)
        : [...prev, occasion],
    );
  };

  const handleSave = async () => {
    if (!user) return;
    if (colors.length === 0) {
      Alert.alert("Missing Color", "Please select at least one color.");
      return;
    }
    if (occasions.length === 0) {
      Alert.alert("Missing Occasion", "Please select at least one occasion.");
      return;
    }

    setSaving(true);

    try {
      // Insert into wardrobe_items — save first URL as cover and full array
      const { data, error } = await supabase
        .from("wardrobe_items")
        .insert({
          user_id: user.id,
          image_url: imageUrls[0],
          image_urls: imageUrls,
          category,
          subcategory: subcategory || null,
          colors,
          pattern,
          occasions,
          formality_score: formalityScore,
          season: initialTags.season ?? ["all-season"],
          ai_tags: initialTags,
          suggested_name: suggestedName || null,
          style_notes: styleNotes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate and save CLIP embedding for semantic search
      try {
        const { embedding } = await generateImageEmbedding(imageUrls[0]);
        await saveEmbedding(data.id, user.id, embedding);
      } catch (embErr) {
        // Non-fatal: item is saved, embedding can be regenerated later
        console.warn("[ReviewTags] Failed to save embedding:", embErr);
      }

      Alert.alert("Saved!", "Your item has been added to your closet.", [
        { text: "OK", onPress: () => navigation.navigate("MainTabs") },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to save item. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReplacePhoto = async (index: number) => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setReplacing(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const newUrl = await uploadWardrobeImage(
        user.id,
        manipulated.uri,
        () => {},
      );
      setImageUrls((prev) =>
        prev.map((url, i) => (i === index ? newUrl : url)),
      );
    } catch {
      Alert.alert("Error", "Failed to replace photo.");
    } finally {
      setReplacing(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!user || imageUrls.length >= MAX_PHOTOS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setReplacing(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const newUrl = await uploadWardrobeImage(
        user.id,
        manipulated.uri,
        () => {},
      );
      setImageUrls((prev) => [...prev, newUrl]);
    } catch {
      Alert.alert("Error", "Failed to add photo.");
    } finally {
      setReplacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrls[selectedPhotoIndex] }}
            style={styles.image}
            resizeMode="cover"
          />
          {replacing && (
            <View style={styles.replacingOverlay}>
              <Text style={styles.replacingText}>Uploading…</Text>
            </View>
          )}
        </View>

        {/* Thumbnail Strip */}
        <View style={styles.thumbnailStrip}>
          {imageUrls.map((url, index) => (
            <TouchableOpacity
              key={url}
              onPress={() => setSelectedPhotoIndex(index)}
              style={[
                styles.thumbnail,
                selectedPhotoIndex === index && styles.thumbnailSelected,
              ]}
            >
              <Image source={{ uri: url }} style={styles.thumbnailImage} />
              <TouchableOpacity
                style={styles.replaceThumbBtn}
                onPress={() => handleReplacePhoto(index)}
              >
                <Text style={styles.replaceThumbBtnText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {imageUrls.length < MAX_PHOTOS && (
            <TouchableOpacity
              style={styles.addThumbnail}
              onPress={handleAddPhoto}
            >
              <Text style={styles.addThumbnailText}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipSelected]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      category === cat && styles.chipTextSelected,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Subcategory */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subcategory (optional)</Text>
          <View style={styles.subcategoryRow}>
            {["kurta", "saree", "blazer", "jeans", "shirt", "dress"].map(
              (sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[
                    styles.chip,
                    subcategory === sub && styles.chipSelected,
                  ]}
                  onPress={() => setSubcategory(subcategory === sub ? "" : sub)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      subcategory === sub && styles.chipTextSelected,
                    ]}
                  >
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>

        {/* Colors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Colors</Text>
          <View style={styles.colorGrid}>
            {COLOR_SWATCHES.map(({ name, hex, border }) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: hex },
                  border && styles.colorSwatchBordered,
                  colors.includes(name.toLowerCase()) &&
                    styles.colorSwatchSelected,
                ]}
                onPress={() => toggleColor(name.toLowerCase())}
              >
                {colors.includes(name.toLowerCase()) && (
                  <Text style={styles.colorCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pattern */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pattern</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {PATTERNS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, pattern === p && styles.chipSelected]}
                  onPress={() => setPattern(p)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      pattern === p && styles.chipTextSelected,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Occasions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Occasions</Text>
          <View style={styles.chipRowWrap}>
            {OCCASIONS.map((occ) => (
              <TouchableOpacity
                key={occ}
                style={[
                  styles.chip,
                  occasions.includes(occ) && styles.chipSelected,
                ]}
                onPress={() => toggleOccasion(occ)}
              >
                <Text
                  style={[
                    styles.chipText,
                    occasions.includes(occ) && styles.chipTextSelected,
                  ]}
                >
                  {occ.charAt(0).toUpperCase() + occ.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name</Text>
          <View style={styles.nameInput}>
            <Text style={styles.nameText}>{suggestedName || "—"}</Text>
          </View>
        </View>

        {/* Style Notes */}
        {styleNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style Notes</Text>
            <Text style={styles.styleNotesText}>{styleNotes}</Text>
          </View>
        ) : null}

        {/* Formality Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formality</Text>
          <View style={styles.formalityContainer}>
            {[1, 2, 3, 4, 5].map((score) => (
              <TouchableOpacity
                key={score}
                style={[
                  styles.formalityStar,
                  formalityScore >= score && styles.formalityStarSelected,
                ]}
                onPress={() => setFormalityScore(score as 1 | 2 | 3 | 4 | 5)}
              >
                <Text
                  style={[
                    styles.formalityStarText,
                    formalityScore >= score && styles.formalityStarTextSelected,
                  ]}
                >
                  {score}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formalityLabels}>
            <Text style={styles.formalityLabel}>Casual</Text>
            <Text style={styles.formalityLabel}>Formal</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save to Closet"}
          </Text>
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
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: "#2C2C2C",
  },
  image: {
    flex: 1,
  },
  replacingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  replacingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  thumbnailStrip: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#2C2C2C",
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailSelected: {
    borderColor: "#C9847A",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  replaceThumbBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  replaceThumbBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  addThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
  },
  addThumbnailText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "300",
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5DDD5",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chipRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5DDD5",
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    borderColor: "#C9847A",
    backgroundColor: "#C9847A",
  },
  chipText: {
    fontSize: 14,
    color: "#7A6F68",
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  subcategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  colorSwatchBordered: {
    borderWidth: 1,
    borderColor: "#E5DDD5",
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: "#2C2C2C",
  },
  colorCheck: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  formalityContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 8,
  },
  formalityStar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#E5DDD5",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  formalityStarSelected: {
    borderColor: "#C9847A",
    backgroundColor: "#C9847A",
  },
  formalityStarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#7A6F68",
  },
  formalityStarTextSelected: {
    color: "#FFFFFF",
  },
  formalityLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  formalityLabel: {
    fontSize: 12,
    color: "#7A6F68",
  },
  saveButton: {
    margin: 16,
    backgroundColor: "#C9847A",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 40,
  },
  nameInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5DDD5",
  },
  nameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2B2B2B",
  },
  styleNotesText: {
    fontSize: 14,
    color: "#7A6F68",
    lineHeight: 20,
    fontStyle: "italic",
  },
});
