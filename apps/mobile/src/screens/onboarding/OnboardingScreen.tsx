import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useOnboarding } from "../../contexts/OnboardingContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RootStackParamList = {
  MainTabs: undefined;
  Onboarding: undefined;
  Auth: undefined;
};

type OnboardingNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Onboarding"
>;

interface SlideData {
  emoji: string;
  title: string;
  subtitle: string;
  isLast?: boolean;
}

const SLIDES: SlideData[] = [
  {
    emoji: "👗",
    title: "Your Wardrobe, Smarter",
    subtitle:
      "AI organizes your clothes, learns your style, and helps you discover new outfits from what you already own.",
  },
  {
    emoji: "📸",
    title: "Snap. Tag. Search.",
    subtitle:
      "Photograph any item. Our AI tags it instantly. Search your closet with plain English — no more digging.",
  },
  {
    emoji: "✨",
    title: "Let's Build Your Closet",
    subtitle:
      "Start by adding your first item. The more you add, the smarter your recommendations become.",
    isLast: true,
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const { completeOnboarding } = useOnboarding();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.dx;
        const currentOffset = currentSlide * SCREEN_WIDTH;
        scrollX.setValue(currentOffset - dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const dx = gestureState.dx;
        const threshold = SCREEN_WIDTH * 0.25;

        if (dx > threshold && currentSlide < SLIDES.length - 1) {
          goToSlide(currentSlide + 1);
        } else if (dx < -threshold && currentSlide > 0) {
          goToSlide(currentSlide - 1);
        } else {
          goToSlide(currentSlide);
        }
      },
    }),
  ).current;

  const goToSlide = (index: number) => {
    Animated.spring(scrollX, {
      toValue: index * SCREEN_WIDTH,
      useNativeDriver: true,
      friction: 6,
    }).start();
    setCurrentSlide(index);
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      goToSlide(currentSlide + 1);
    }
  };

  const handleSkip = () => {
    goToSlide(SLIDES.length - 1);
  };

  const handleGetStarted = async () => {
    try {
      await completeOnboarding();
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  const handleSignIn = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Auth" }],
    });
  };

  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.slidesContainer} {...panResponder.panHandlers}>
        {SLIDES.map((slide, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.9, 1, 0.9],
            extrapolate: "clamp",
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.slide,
                {
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <Text style={styles.emoji}>{slide.emoji}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor:
                      index === currentSlide ? "#C9847A" : "#D4C4BC",
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.buttonContainer}>
          {isLastSlide ? (
            <Pressable
              style={styles.getStartedButton}
              onPress={handleGetStarted}
            >
              <Text style={styles.getStartedText}>Start Adding Items</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>Next</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0EA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: "#7A6F68",
    fontWeight: "500",
  },
  slidesContainer: {
    flex: 1,
    flexDirection: "row",
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#7A6F68",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    alignItems: "center",
  },
  nextButton: {
    backgroundColor: "#C9847A",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  getStartedButton: {
    backgroundColor: "#C9847A",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
  },
  getStartedText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
