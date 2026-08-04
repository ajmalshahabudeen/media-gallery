import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReelsFeed } from "../../components/preview/ReelsFeed";

export default function ReelsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ReelsFeed />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
