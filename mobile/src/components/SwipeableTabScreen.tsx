import React from "react";
import { View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useRouter, useSegments } from "expo-router";
import { useMobileStore } from "../store/useMobileStore";

const BASE_TABS = ["index", "reels", "favorites", "settings"] as const;

function hrefForTab(name: string): "/(tabs)" | "/(tabs)/reels" | "/(tabs)/favorites" | "/(tabs)/settings" | "/(tabs)/admin" {
  if (name === "index") return "/(tabs)";
  if (name === "reels") return "/(tabs)/reels";
  if (name === "favorites") return "/(tabs)/favorites";
  if (name === "settings") return "/(tabs)/settings";
  return "/(tabs)/admin";
}

export function SwipeableTabScreen({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const isAdmin = useMobileStore((s) => s.user?.role === "admin");
  const tabs = isAdmin ? [...BASE_TABS, "admin"] : [...BASE_TABS];

  const go = (dir: 1 | -1) => {
    const current = (segments[1] as string | undefined) || "index";
    const index = tabs.indexOf(current as (typeof tabs)[number]);
    if (index < 0) return;
    const next = tabs[index + dir];
    if (!next) return;
    router.navigate(hrefForTab(next));
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-40, 40])
    .failOffsetY([-28, 28])
    .onEnd((event) => {
      if (event.translationX < -56) {
        runOnJS(go)(1);
      } else if (event.translationX > 56) {
        runOnJS(go)(-1);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
