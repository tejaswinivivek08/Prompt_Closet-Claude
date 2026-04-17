import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "@/contexts/AuthContext";
import { uploadWardrobeImage, UploadError } from "@/services/storageService";
import { analyzeClothingItem } from "@/services/taggingService";

interface AddItemScreenProps {
  navigation: any;
}

type UploadStage =
  | "idle"
  | "camera"
  | "library"
  | "compressing"
  | "uploading"
  | "analyzing"
  | "preview"
  | "done"
  | "error";

export default function AddItemScreen({ navigation }: AddItemScreenProps) {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(true); // Show modal on mount
  const [stage, setStage] = useState<UploadStage>("idle");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [compressedUri, setCompressedUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuidance, setShowGuidance] = useState(false);

  const PHOTO_GUIDANCE =
    "Lay items flat. Use natural light. Avoid busy backgrounds.";

  const launchCameraWithGuidance = async () => {
    setModalVisible(false);
    const hasPermission = await requestPermissions("camera");
    if (!hasPermission) return;

    setShowGuidance(true);
    setTimeout(async () => {
      setShowGuidance(false);
      setStage("camera");
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      } else {
        setStage("idle");
      }
    }, 1500);
  };

  const launchLibraryWithGuidance = async () => {
    setModalVisible(false);
    const hasPermission = await requestPermissions("library");
    if (!hasPermission) return;

    setShowGuidance(true);
    setTimeout(async () => {
      setShowGuidance(false);
      setStage("library");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      } else {
        setStage("idle");
      }
    }, 1500);
  };

  const requestPermissions = async (
    type: "camera" | "library",
  ): Promise<boolean> => {
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Please enable camera access in Settings to take photos.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => ImagePicker.requestCameraPermissionsAsync(),
            },
          ],
        );
        return false;
      }
      return true;
    } else {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Photo Library Permission Required",
          "Please enable photo library access in Settings to select photos.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync(),
            },
          ],
        );
        return false;
      }
      return true;
    }
  };

  const processImage = async (uri: string) => {
    try {
      setStage("compressing");
      setSelectedImage(uri);

      // Compress image: max 1200px width, quality 0.8
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      setCompressedUri(manipulated.uri);
      setStage("preview");
    } catch (error) {
      setErrorMessage("Failed to process image. Please try again.");
      setStage("error");
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!compressedUri || !user) return;

    try {
      setStage("uploading");
      setUploadProgress(10);

      // Upload to Supabase Storage
      const imageUrl = await uploadWardrobeImage(
        user.id,
        compressedUri,
        (progress) => setUploadProgress(10 + Math.round(progress * 0.5)),
      );

      setStage("analyzing");
      setUploadProgress(60);

      // Call AI tagging service
      const result = await analyzeClothingItem(imageUrl);
      const tags = result.tags;

      setStage("done");

      // Navigate to review screen with all data
      navigation.navigate("ReviewTags", {
        imageUrl,
        tags,
      });
    } catch (error) {
      if (error instanceof UploadError) {
        if (error.code === "UPLOAD_FAILED") {
          setErrorMessage(
            "Upload failed. Please check your connection and try again.",
          );
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
      setStage("error");
    }
  };

  const handleRetry = () => {
    setSelectedImage(null);
    setCompressedUri(null);
    setErrorMessage(null);
    setUploadProgress(0);
    setStage("idle");
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Choice Modal */}
      <Modal
        visible={modalVisible && stage === "idle"}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <Text style={styles.modalSubtitle}>
              How would you like to add a clothing item?
            </Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={launchCameraWithGuidance}
            >
              <Text style={styles.modalOptionIcon}>📷</Text>
              <View>
                <Text style={styles.modalOptionTitle}>Take Photo</Text>
                <Text style={styles.modalOptionDesc}>
                  Use camera to photograph item
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={launchLibraryWithGuidance}
            >
              <Text style={styles.modalOptionIcon}>🖼️</Text>
              <View>
                <Text style={styles.modalOptionTitle}>Choose from Library</Text>
                <Text style={styles.modalOptionDesc}>
                  Select existing photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => {
                setModalVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Preview Screen */}
      {stage === "preview" && selectedImage && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: selectedImage }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={handleAnalyzeWithAI}
              activeOpacity={0.8}
            >
              <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetry}>
              <Text style={styles.retakeButtonText}>Choose Different</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Photo Guidance Overlay */}
      {showGuidance && (
        <View style={styles.guidanceOverlay}>
          <View style={styles.guidanceCard}>
            <Text style={styles.guidanceIcon}>💡</Text>
            <Text style={styles.guidanceText}>{PHOTO_GUIDANCE}</Text>
          </View>
        </View>
      )}

      {/* Loading States */}
      {["compressing", "uploading", "analyzing", "camera", "library"].includes(
        stage,
      ) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9847A" />
          <Text style={styles.loadingText}>
            {stage === "compressing" && "Processing image..."}
            {stage === "uploading" && "Uploading..."}
            {stage === "analyzing" && "Analyzing with AI..."}
            {stage === "camera" && "Opening camera..."}
            {stage === "library" && "Opening library..."}
          </Text>
          {stage === "uploading" && (
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${uploadProgress}%` }]}
              />
            </View>
          )}
        </View>
      )}

      {/* Error State */}
      {stage === "error" && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0EA",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#7A6F68",
    textAlign: "center",
    marginBottom: 24,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5DDD5",
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOptionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  modalOptionDesc: {
    fontSize: 13,
    color: "#7A6F68",
    marginTop: 2,
  },
  modalCancel: {
    marginTop: 8,
    padding: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#7A6F68",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#2C2C2C",
  },
  previewImage: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
  },
  previewActions: {
    padding: 16,
    backgroundColor: "#2C2C2C",
  },
  analyzeButton: {
    backgroundColor: "#C9847A",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  analyzeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  retakeButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  retakeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F0EA",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#7A6F68",
  },
  progressBar: {
    width: "60%",
    height: 4,
    backgroundColor: "#E5DDD5",
    borderRadius: 2,
    marginTop: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C9847A",
    borderRadius: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F0EA",
    padding: 24,
  },
  guidanceOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  guidanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    maxWidth: 320,
    alignItems: "center",
  },
  guidanceIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  guidanceText: {
    fontSize: 15,
    color: "#2C2C2C",
    textAlign: "center",
    lineHeight: 22,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#C9847A",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
