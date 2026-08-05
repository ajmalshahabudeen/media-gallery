import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useMobileStore } from "../store/useMobileStore";

/**
 * Entry redirect gate.
 * Uses declarative <Redirect /> to prevent imperative navigation race condition crashes on release APKs.
 */
export default function IndexGate() {
  const { authChecked, isAuthenticated } = useMobileStore();

  if (!authChecked) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
});
