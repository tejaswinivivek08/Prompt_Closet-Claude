/**
 * NeglectedBadge — shown on closet grid items not worn in 45+ days
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface NeglectedBadgeProps {
  daysSinceWorn: number | null;
}

export default function NeglectedBadge({ daysSinceWorn }: NeglectedBadgeProps) {
  if (daysSinceWorn === null) return null;

  const label =
    daysSinceWorn >= 365
      ? `${Math.floor(daysSinceWorn / 365)}y unused`
      : daysSinceWorn >= 30
        ? `${Math.floor(daysSinceWorn / 30)}mo unused`
        : `${daysSinceWorn}d unused`;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>😴 {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(201, 169, 110, 0.92)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  text: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
