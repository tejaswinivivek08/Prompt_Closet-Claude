import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useOnboarding } from "../contexts/OnboardingContext";
import SignInScreen from "../screens/auth/SignInScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import ClosetScreen from "../screens/wardrobe/ClosetScreen";
import StyleHistoryScreen from "../screens/wardrobe/StyleHistoryScreen";
import StyleDNAScreen from "../screens/wardrobe/StyleDNAScreen";
import SearchScreen from "../screens/wardrobe/SearchScreen";
import AddItemScreen from "../screens/wardrobe/AddItemScreen";
import ItemDetailScreen from "../screens/wardrobe/ItemDetailScreen";
import MagicBarScreen from "../screens/wardrobe/MagicBarScreen";
import ReviewTagsScreen from "../screens/wardrobe/ReviewTagsScreen";
import EditItemScreen from "../screens/wardrobe/EditItemScreen";
import ProfileScreen from "../screens/wardrobe/ProfileScreen";

// ─── Custom Tab Bar ─────────────────────────────────────────────────────────

const TAB_BAR_TABS = [
  { name: "Closet", icon: require("../assets/tab-closet.png") },
  { name: "Style", icon: require("../assets/tab-style.png") },
  { name: "Search", icon: require("../assets/tab-search.png") },
  { name: "Calendar", icon: require("../assets/tab-history.png") },
  { name: "Profile", icon: require("../assets/tab-profile.png") },
];

const FAB_OPTIONS = [
  { id: "camera", icon: "📷", label: "Take Photo" },
  { id: "library", icon: "🖼️", label: "Upload from Photos" },
  { id: "files", icon: "📁", label: "Upload from Files" },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const staggerAnims = FAB_OPTIONS.map(
    (_) => useRef(new Animated.Value(0)).current,
  );

  const toggleFab = () => {
    const to = fabOpen ? 0 : 1;
    Animated.spring(fabAnim, {
      toValue: to,
      friction: 6,
      tension: 65,
      useNativeDriver: true,
    }).start();

    if (!fabOpen) {
      FAB_OPTIONS.forEach((_, i) => {
        Animated.sequence([
          Animated.delay(i * 60),
          Animated.spring(staggerAnims[i], {
            toValue: 1,
            friction: 7,
            tension: 65,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      [...staggerAnims].reverse().forEach((anim, i) => {
        Animated.sequence([
          Animated.delay(i * 30),
          Animated.timing(anim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
    setFabOpen(!fabOpen);
  };

  const handleFabSelect = (optionId: string) => {
    toggleFab();
    // Navigate to AddItem tab and pass option
    navigation.navigate("AddItem", { option: optionId });
  };

  const backdropOpacity = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const fabRotate = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });
  const fabBg = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#C9847A", "#8B5A52"],
  });

  // Breathing animation for idle FAB
  const breathAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!fabOpen) {
      const breath = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1.06,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );
      breath.start();
      return () => breath.stop();
    } else {
      breathAnim.setValue(1);
    }
  }, [fabOpen]);

  return (
    <View style={tabStyles.tabBarContainer}>
      {/* Backdrop */}
      {fabOpen && (
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={toggleFab}
        >
          <Animated.View
            style={[tabStyles.fabBackdrop, { opacity: backdropOpacity }]}
          />
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={tabStyles.tabsRow}>
        {state.routes.map((route: any, index: number) => {
          const isActive = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const icon = TAB_BAR_TABS[index]?.icon;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={tabStyles.tab}
            >
              {icon ? (
                <Image
                  source={icon}
                  style={[
                    tabStyles.tabIcon,
                    isActive && tabStyles.tabIconActive,
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <Text
                  style={[
                    tabStyles.tabLabel,
                    isActive && tabStyles.tabLabelActive,
                  ]}
                >
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* FAB — centered above tab bar */}
      <View style={tabStyles.fabContainer} pointerEvents="box-none">
        {/* FAB Options */}
        <View style={tabStyles.fabOptionsContainer} pointerEvents="box-none">
          {FAB_OPTIONS.map((option, i) => {
            const translateY = staggerAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [24, 0],
            });
            const scale = staggerAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            });
            const opacity = staggerAnims[i];
            return (
              <Animated.View
                key={option.id}
                style={[
                  tabStyles.fabOptionWrap,
                  { transform: [{ translateY }, { scale }], opacity },
                ]}
              >
                <TouchableOpacity
                  style={tabStyles.fabOption}
                  onPress={() => handleFabSelect(option.id)}
                  activeOpacity={0.8}
                >
                  <Text style={tabStyles.fabOptionIcon}>{option.icon}</Text>
                  <View style={tabStyles.fabOptionLabel}>
                    <Text style={tabStyles.fabOptionLabelText}>
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* FAB Button */}
        <Animated.View
          style={[
            tabStyles.fabTouch,
            {
              backgroundColor: fabBg,
              transform: [
                { scale: fabOpen ? 1 : breathAnim },
                { rotate: fabRotate },
              ],
            },
          ]}
        >
          <TouchableOpacity
            onPress={toggleFab}
            activeOpacity={0.9}
            style={tabStyles.fabTouchInner}
          >
            <Text style={tabStyles.fabPlus}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  tabBarContainer: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E0D8",
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  tabsRow: {
    flexDirection: "row",
    height: 56,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIcon: {
    width: 26,
    height: 26,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: "#888780",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#C9847A",
  },
  fabBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 0,
  },
  fabContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  fabOptionsContainer: {
    position: "absolute",
    bottom: 70,
    alignItems: "center",
  },
  fabOptionWrap: {
    marginBottom: 14,
    alignItems: "center",
  },
  fabOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  fabOptionIcon: {
    fontSize: 20,
  },
  fabOptionLabel: {
    backgroundColor: "#F5F0EA",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  fabOptionLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2B2B2B",
  },
  fabTouch: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#C9847A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C9847A",
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 10,
    marginBottom: -8,
  },
  fabTouchInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: "center",
    alignItems: "center",
  },
  fabPlus: {
    fontSize: 30,
    color: "#FFFFFF",
    fontWeight: "300",
    marginTop: -2,
  },
});

// ─── Navigators ─────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: "#F5F0EA" },
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Closet" component={ClosetScreen} />
      <Tab.Screen name="Style" component={MagicBarScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Calendar" component={StyleHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {/* Hidden AddItem route — accessed via FAB */}
      <Tab.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { hasCompletedOnboarding, isLoading: onboardingLoading } =
    useOnboarding();

  if (loading || onboardingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C9847A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && session.user ? (
          hasCompletedOnboarding ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen
                name="ReviewTags"
                component={ReviewTagsScreen as any}
                options={{
                  presentation: "modal",
                  headerShown: true,
                  headerTitle: "Review Tags",
                  headerStyle: { backgroundColor: "#F5F0EA" },
                  headerTintColor: "#2B2B2B",
                }}
              />
              <Stack.Screen
                name="ItemDetail"
                component={ItemDetailScreen as any}
                options={{
                  presentation: "fullScreenModal",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="EditItem"
                component={EditItemScreen as any}
                options={{
                  presentation: "fullScreenModal",
                  headerShown: true,
                  headerTitle: "Edit Tags",
                  headerStyle: { backgroundColor: "#F5F0EA" },
                  headerTintColor: "#2B2B2B",
                }}
              />
              <Stack.Screen
                name="StyleDNA"
                component={StyleDNAScreen}
                options={{
                  presentation: "modal",
                  headerShown: true,
                  headerTitle: "Style DNA",
                  headerStyle: { backgroundColor: "#F5F0EA" },
                  headerTintColor: "#2B2B2B",
                }}
              />
            </>
          ) : (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F0EA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#7A6F68",
  },
});

export default RootNavigator;
