import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useMobileStore } from "../store/useMobileStore";

/**
 * Entry redirect gate.
 * Production APKs crash if navigation fires before the root navigator is ready,
 * so heavy lifting stays in root _layout; this screen only bounces once ready.
 */
export default function IndexGate() {
  const router = useRouter();
  const { authChecked, isAuthenticated } = useMobileStore();

  useEffect(() => {
    if (!authChecked) return;
    if (isAuthenticated) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/sign-in");
    }
  }, [authChecked, isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
});
