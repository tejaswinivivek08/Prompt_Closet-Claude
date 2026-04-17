import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";

const SKIN_TONE_OPTIONS = [
  { label: "Fair Cool", value: "fair-cool" },
  { label: "Fair Warm", value: "fair-warm" },
  { label: "Medium Cool", value: "medium-cool" },
  { label: "Medium Warm", value: "medium-warm" },
  { label: "Deep Cool", value: "deep-cool" },
  { label: "Deep Warm", value: "deep-warm" },
];

export default function SignUpScreen({ navigation }: any) {
  const { signUp, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [skinTone, setSkinTone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setSubmitting(false);

    if (error) {
      if (error.message.includes("already registered")) {
        Alert.alert(
          "Email Taken",
          "This email is already registered. Try signing in instead.",
        );
      } else if (error.message.includes("network")) {
        Alert.alert(
          "Network Error",
          "Please check your internet connection and try again.",
        );
      } else {
        Alert.alert("Error", error.message);
      }
    } else {
      Alert.alert(
        "Check Your Email",
        "We sent a confirmation link. Please verify your email to continue.",
        [{ text: "OK", onPress: () => navigation.navigate("SignIn") }],
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Prompt Closet</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Doe"
            placeholderTextColor="#A0978E"
            autoCapitalize="words"
            textContentType="name"
            editable={!submitting}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#A0978E"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoCorrect={false}
            editable={!submitting}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor="#A0978E"
            secureTextEntry
            textContentType="newPassword"
            editable={!submitting}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor="#A0978E"
            secureTextEntry
            textContentType="newPassword"
            editable={!submitting}
          />

          <Text style={[styles.label, styles.labelWithMargin]}>
            Skin Tone (optional)
          </Text>
          <View style={styles.skinToneContainer}>
            {SKIN_TONE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.skinToneChip,
                  skinTone === option.value && styles.skinToneChipSelected,
                ]}
                onPress={() =>
                  setSkinTone(skinTone === option.value ? null : option.value)
                }
                disabled={submitting}
              >
                <Text
                  style={[
                    styles.skinToneText,
                    skinTone === option.value && styles.skinToneTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.goBack()}
            disabled={submitting}
          >
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0EA",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#7A6F68",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  labelWithMargin: {
    marginTop: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDD5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#2C2C2C",
    marginBottom: 16,
  },
  skinToneContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  skinToneChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5DDD5",
    backgroundColor: "#FFFFFF",
  },
  skinToneChipSelected: {
    borderColor: "#C9847A",
    backgroundColor: "#C9847A",
  },
  skinToneText: {
    fontSize: 13,
    color: "#7A6F68",
  },
  skinToneTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#C9847A",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    color: "#7A6F68",
  },
  linkTextBold: {
    color: "#C9847A",
    fontWeight: "600",
  },
});
