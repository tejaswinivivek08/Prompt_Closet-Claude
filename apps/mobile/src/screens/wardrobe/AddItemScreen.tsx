import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  TouchableOpacity,
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

// ─── Screen ─────────────────────────────────────────────────────────────────

type Stage = "idle" | "analyzing" | "done" | "error";

export default function AddItemScreen({
  navigation,
  route,
}: AddItemScreenProps) {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      handleSelect(option);
    }
  }, [route?.params?.option]);

  const handleSelect = async (optionId: string) => {
    if (!isConnected) {
      Alert.alert("Offline", "Photos can't be uploaded while offline.");
      return;
    }
    try {
      let uri: string | null = null;

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
        uri = result.assets[0].uri;
      } else {
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
        });
        if (result.canceled || !result.assets?.[0]) return;
        uri = result.assets[0].uri;
      }

      await processImage(uri);
    } catch {
      setErrorMessage("Failed to select image. Please try again.");
      setStage("error");
    }
  };

  const processImage = async (uri: string) => {
    setStage("analyzing");

    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const imageUrl = await uploadWardrobeImage(
        user!.id,
        manipulated.uri,
        () => {},
      );

      let tags;
      try {
        tags = (await analyzeClothingItem(imageUrl)).tags;
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
        tags = generateMockTags("top");
      }

      setStage("done");
      navigation.navigate("ReviewTags", { imageUrl, tags });
      // Reset so next FAB open is fresh
      setTimeout(() => setStage("idle"), 500);
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

  // ─── Idle: show hint ────────────────────────────────────────────────────
  if (stage === "idle") {
    return (
      <SafeAreaView style={styles.idleContainer} edges={["top"]}>
        <Text style={styles.idleHint}>Tap the + button to add an item</Text>
      </SafeAreaView>
    );
  }

  // ─── Analyzing: pulsing screen ───────────────────────────────────────────
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
        <Text style={styles.analyzingTitle}>Scanning & Analyzing…</Text>
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
        <View style={styles.retryButton}>
          <TouchableOpacity onPress={handleRetry} style={styles.retryBtnInner}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: "center",
    alignItems: "center",
  },
  idleHint: {
    fontSize: 15,
    color: "#A0978E",
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
    color: "#2B2B2B",
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
    color: "#2B2B2B",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#C9847A",
    borderRadius: 12,
    overflow: "hidden",
  },
  retryBtnInner: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
