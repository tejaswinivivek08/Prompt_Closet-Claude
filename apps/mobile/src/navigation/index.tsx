import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import SignInScreen from "@/screens/auth/SignInScreen";
import SignUpScreen from "@/screens/auth/SignUpScreen";
import ClosetScreen from "@/screens/wardrobe/ClosetScreen";
import AddItemScreen from "@/screens/wardrobe/AddItemScreen";
import ItemDetailScreen from "@/screens/wardrobe/ItemDetailScreen";
import MagicBarScreen from "@/screens/wardrobe/MagicBarScreen";
import ReviewTagsScreen from "@/screens/wardrobe/ReviewTagsScreen";

// Auth stack
const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F0EA" },
      }}
    >
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

// Main tab navigator
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#C9847A",
        tabBarInactiveTintColor: "#7A6F68",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5DDD5",
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: "#F5F0EA",
        },
        headerTintColor: "#2C2C2C",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Closet"
        component={ClosetScreen}
        options={{
          title: "My Closet",
          tabBarLabel: "Closet",
        }}
      />
      <Tab.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{
          title: "Add Item",
          tabBarLabel: "Add",
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Style"
        component={MagicBarScreen}
        options={{
          title: "AI Stylist",
          tabBarLabel: "Style",
        }}
      />
      <Tab.Screen
        name="Search"
        component={ClosetScreen} // Placeholder - replace with SearchScreen
        options={{
          title: "Search",
          tabBarLabel: "Search",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ClosetScreen} // Placeholder - replace with ProfileScreen
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}

// Root navigator with auth gate
const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C9847A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {session && session.user ? (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen
              name="ReviewTags"
              component={ReviewTagsScreen}
              options={{
                presentation: "modal",
                headerShown: true,
                headerTitle: "Review Tags",
                headerStyle: { backgroundColor: "#F5F0EA" },
                headerTintColor: "#2C2C2C",
              }}
            />
            <RootStack.Screen
              name="ItemDetail"
              component={ItemDetailScreen}
              options={{
                presentation: "fullScreenModal",
                headerShown: false,
              }}
            />
            <RootStack.Screen
              name="MagicBar"
              component={MagicBarScreen}
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
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
