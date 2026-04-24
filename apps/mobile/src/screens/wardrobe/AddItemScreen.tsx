import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "../../contexts/AuthContext";
import { useNetwork } from "../../contexts/NetworkContext";
import {
  uploadWardrobeImage,
  UploadError,
} from "../../services/storageService";
import { analyzeClothingItem } from "../../services/taggingService";

const MAX_PHOTOS = 4;
const SCREEN_W = Dimensions.get("window").width;

interface AddItemScreenProps {
  navigation: any;
  route: any;
}

// ─── AI Mock Tags Generator ─────────────────────────────────────────────────

function generateMockTags(category = "top") {
  const materials = [
    "Cotton",
    "Silk",
    "Linen",
    "Polyester",
    "Chiffon",
    "Georgette",
    "Crepe",
  ];
  const occasions = [
    "casual",
    "office",
    "party",
    "festive",
    "wedding",
    "temple",
    "beach",
    "date",
  ];
  const colors = [
    "Red",
    "Blue",
    "Green",
    "Black",
    "White",
    "Navy",
    "Pink",
    "Beige",
    "Maroon",
  ];
  const patterns = [
    "solid",
    "striped",
    "floral",
    "printed",
    "embroidered",
    "checkered",
  ] as const;
  const subcategories: Record<string, string[]> = {
    top: ["Blouse", "Crop Top", "T-Shirt", "Shirt", "Kurta"],
    bottom: ["Jeans", "Palazzo", "Skirt", "Pants", "Leggings"],
    dress: ["Maxi", "Midi", "Mini", "Gown", "Saree"],
    outerwear: ["Blazer", "Cardigan", "Jacket", "Cape"],
    footwear: ["Heels", "Flats", "Sneakers", "Sandals"],
    accessory: ["Bag", "Belt", "Scarf", "Jewelry"],
    traditional: ["Kurta", "Saree", "Lehenga", "Sherwani"],
  };
  const suggestedNames: Record<string, string[]> = {
    top: ["Classic Cotton Blouse", "Flowy Festival Top", "Elegant Silk Kurta"],
    bottom: ["High-Waist Palazzo", "Classic Blue Jeans", "Pleated Skirt"],
    dress: ["Breezy Maxi Dress", "Festive Saree", "Chic Midi Dress"],
    outerwear: ["Tailored Linen Blazer", "Cozy Cardigan", "Denim Jacket"],
    footwear: ["Strappy Block Heels", "White Sneakers", "Embellished Flats"],
    accessory: ["Handwoven Silk Scarf", "Leather Belt", "Pearl Earrings"],
    traditional: [
      "Embroidered Anarkali Kurta",
      "Banarasi Saree",
      "Velvet Lehenga",
    ],
  };

  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const pickN = <T,>(arr: T[], n: number) => {
    const s = [...arr].sort(() => 0.5 - Math.random());
    return s.slice(0, n);
  };

  const subs = subcategories[category] ?? subcategories.top;
  const cats = category as keyof typeof subcategories;

  return {
    category,
    subcategory: pick(subs),
    material: pick(materials),
    colors: pickN(colors, Math.floor(Math.random() * 2) + 1),
    pattern: pick([...patterns]),
    occasions: pickN([...occasions], Math.floor(Math.random() * 3) + 1),
    formality_score: (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
    suggested_name: pick(suggestedNames[cats] ?? suggestedNames.top),
    style_notes: "Versatile piece that works across multiple occasions.",
    season: ["all-season"] as string[],
  };
}

// ─── Bottom Sheet ────────────────────────────────────────────────────────────

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: "camera" | "library" | "files") => void;
}

function AddItemBottomSheet({ visible, onClose, onSelect }: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add New Item</Text>

          <TouchableOpacity
            style={styles.sheetOption}
            onPress={() => {
              onSelect("camera");
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.sheetOptionIcon}>📷</Text>
            <View style={styles.sheetOptionText}>
              <Text style={styles.sheetOptionLabel}>Take Photo</Text>
              <Text style={styles.sheetOptionSub}>Use your camera</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetOption}
            onPress={() => {
              onSelect("library");
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.sheetOptionIcon}>🖼️</Text>
            <View style={styles.sheetOptionText}>
              <Text style={styles.sheetOptionLabel}>Choose from Library</Text>
              <Text style={styles.sheetOptionSub}>Pick from your photos</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sheetOption}
            onPress={() => {
              onSelect("files");
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.sheetOptionIcon}>📁</Text>
            <View style={styles.sheetOptionText}>
              <Text style={styles.sheetOptionLabel}>Upload from Files</Text>
              <Text style={styles.sheetOptionSub}>Browse file storage</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

type Stage = "idle" | "preview" | "analyzing" | "done" | "error";

export default function AddItemScreen({
  navigation,
  route,
}: AddItemScreenProps) {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const [stage, setStage] = useState<Stage>("idle");
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (stage === "analyzing") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0);
    }
  }, [stage]);

  // Auto-launch if option passed from FAB
  useEffect(() => {
    const option = route?.params?.option as string | undefined;
    if (option && stage === "idle") {
      handleSelectOption(option);
    }
  }, [route?.params?.option]);

  const handleSelectOption = async (optionId: string) => {
    if (!isConnected) {
      Alert.alert("Offline", "Photos can't be uploaded while offline.");
      return;
    }
    try {
      let uris: string[] = [];

      if (optionId === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Camera access required.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
        if (result.canceled || !result.assets?.[0]) return;
        uris = result.assets.map((a) => a.uri);
      } else if (optionId === "library") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Photo library access required.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
          allowsMultipleSelection: true,
        });
        if (result.canceled || !result.assets?.length) return;
        uris = result.assets.map((a) => a.uri).slice(0, MAX_PHOTOS);
      } else {
        // Files — fall back to library picker for document access
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "File access required.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1,
          allowsMultipleSelection: true,
        });
        if (result.canceled || !result.assets?.length) return;
        uris = result.assets.map((a) => a.uri).slice(0, MAX_PHOTOS);
      }

      setSelectedUris(uris);
      setStage("preview");
    } catch {
      setErrorMessage("Failed to select image. Please try again.");
      setStage("error");
    }
  };

  const handleConfirmPhotos = async () => {
    if (selectedUris.length === 0) return;
    await processImages(selectedUris);
  };

  const processImages = async (uris: string[]) => {
    setStage("analyzing");

    try {
      const uploadedPhotos = await Promise.all(
        uris.map(async (uri) => {
          const manipulated = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
          );
          return uploadWardrobeImage(user!.id, manipulated.uri, () => {});
        }),
      );

      let tags;
      try {
        tags = (await analyzeClothingItem(uploadedPhotos[0])).tags;
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
        tags = generateMockTags("top");
      }

      navigation.navigate("ReviewTags", { imageUrls: uploadedPhotos, tags });
      setTimeout(() => {
        setStage("idle");
        setSelectedUris([]);
      }, 500);
    } catch (error) {
      if (error instanceof UploadError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
      setStage("error");
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setStage("idle");
  };

  // ─── Idle ────────────────────────────────────────────────────────────────
  if (stage === "idle") {
    return (
      <SafeAreaView style={styles.idleContainer} edges={["top"]}>
        <View style={styles.idleContent}>
          <Text style={styles.idleIcon}>👗</Text>
          <Text style={styles.idleTitle}>Add items to your closet</Text>
          <Text style={styles.idleHint}>
            Build your virtual wardrobe by adding photos of your clothing
          </Text>
          <TouchableOpacity
            style={styles.idleAddBtn}
            onPress={() => setSheetVisible(true)}
          >
            <Text style={styles.idleAddBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>
        <AddItemBottomSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onSelect={handleSelectOption}
        />
      </SafeAreaView>
    );
  }

  // ─── Preview ────────────────────────────────────────────────────────────
  if (stage === "preview") {
    return (
      <SafeAreaView style={styles.previewContainer} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.previewScroll}>
          <Text style={styles.previewTitle}>
            {selectedUris.length} photo{selectedUris.length > 1 ? "s" : ""}{" "}
            selected
          </Text>
          <View style={styles.previewGrid}>
            {selectedUris.map((uri, i) => (
              <View key={uri} style={styles.previewThumb}>
                <Image source={{ uri }} style={styles.previewThumbImage} />
                {i === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          <Text style={styles.previewSubtitle}>
            First photo is the cover.{" "}
            {selectedUris.length < MAX_PHOTOS
              ? `You can add up to ${MAX_PHOTOS} photos.`
              : `${MAX_PHOTOS} photos — the maximum.`}
          </Text>
          <TouchableOpacity
            style={styles.analyzeBtn}
            onPress={handleConfirmPhotos}
          >
            <Text style={styles.analyzeBtnText}>✨ Analyze with AI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => setSheetVisible(true)}
          >
            <Text style={styles.changeBtnText}>Change Photos</Text>
          </TouchableOpacity>
        </ScrollView>
        <AddItemBottomSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onSelect={handleSelectOption}
        />
      </SafeAreaView>
    );
  }

  // ─── Analyzing ──────────────────────────────────────────────────────────
  if (stage === "analyzing") {
    const scale = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1.08],
    });
    const opacity = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.65, 1],
    });

    return (
      <SafeAreaView style={styles.analyzingContainer} edges={["top"]}>
        <Animated.View
          style={[
            styles.analyzingIconWrapper,
            { transform: [{ scale }], opacity },
          ]}
        >
          <Text style={styles.analyzingIcon}>✨</Text>
        </Animated.View>
        <Text style={styles.analyzingTitle}>Analyzing with AI…</Text>
        <Text style={styles.analyzingSubtitle}>
          Detecting colors, fabric & style
        </Text>
        <View style={styles.analyzingDots}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.analyzingDot,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <SafeAreaView style={styles.errorContainer} edges={["top"]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <AddItemBottomSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onSelect={handleSelectOption}
        />
      </SafeAreaView>
    );
  }

  return null;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  idleContainer: {
    flex: 1,
    backgroundColor: "#F5F0EA",
  },
  idleContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  idleIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  idleTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "center",
  },
  idleHint: {
    fontSize: 15,
    color: "#7A6F68",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  idleAddBtn: {
    backgroundColor: "#C9847A",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 36,
  },
  idleAddBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#F5F0EA",
  },
  previewScroll: {
    padding: 20,
    alignItems: "center",
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 16,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 16,
  },
  previewThumb: {
    width: (SCREEN_W - 50) / 2,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E8E0D8",
  },
  previewThumbImage: {
    width: "100%",
    height: "100%",
  },
  coverBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  coverBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  previewSubtitle: {
    fontSize: 13,
    color: "#7A6F68",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  analyzeBtn: {
    backgroundColor: "#C9847A",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  analyzeBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  changeBtn: {
    paddingVertical: 12,
  },
  changeBtnText: {
    color: "#7A6F68",
    fontSize: 15,
    fontWeight: "500",
  },
  analyzingContainer: {
    flex: 1,
    backgroundColor: "#F5F0EA",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  analyzingIconWrapper: {
    marginBottom: 24,
  },
  analyzingIcon: {
    fontSize: 72,
  },
  analyzingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "center",
  },
  analyzingSubtitle: {
    fontSize: 15,
    color: "#7A6F68",
    marginBottom: 32,
    textAlign: "center",
  },
  analyzingDots: {
    flexDirection: "row",
    gap: 10,
  },
  analyzingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C9847A",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#F5F0EA",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 24,
  },
  retryBtn: {
    backgroundColor: "#C9847A",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Bottom sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0D8D0",
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 20,
    textAlign: "center",
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F5F0",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 60,
  },
  sheetOptionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  sheetOptionText: {
    flex: 1,
  },
  sheetOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  sheetOptionSub: {
    fontSize: 12,
    color: "#A0978E",
    marginTop: 2,
  },
  sheetCancel: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 16,
    color: "#A0978E",
    fontWeight: "500",
  },
});
