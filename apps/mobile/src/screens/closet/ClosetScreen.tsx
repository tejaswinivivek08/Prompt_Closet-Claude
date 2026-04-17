import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import AddItemButton from "@/components/AddItemButton";

export default function ClosetScreen({ navigation }: any) {
  const handleAddItem = () => {
    navigation.navigate("AddItem");
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        numColumns={3}
        keyExtractor={() => "empty"}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👗</Text>
            <Text style={styles.emptyTitle}>Your closet is empty</Text>
            <Text style={styles.emptySubtitle}>
              Start by adding your first clothing item
            </Text>
          </View>
        }
        renderItem={() => null}
      />
      <AddItemButton onPress={handleAddItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F0EA",
  },
  gridContent: {
    flexGrow: 1,
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#7A6F68",
    textAlign: "center",
  },
});
