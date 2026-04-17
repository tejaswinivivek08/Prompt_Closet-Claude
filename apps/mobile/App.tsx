import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";
import { OnboardingProvider } from "./src/contexts/OnboardingContext";
import RootNavigator from "./src/navigation/index";

export default function App() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </OnboardingProvider>
    </AuthProvider>
  );
}
