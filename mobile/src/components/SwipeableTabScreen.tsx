import React from "react";
import { View, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useNavigation } from "expo-router";
import { useMobileStore } from "../store/useMobileStore";

const BASE_TABS = ["index", "reels", "favorites", "settings"] as const;

export function SwipeableTabScreen({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  const isAdmin = useMobileStore((s) => s.user?.role === "admin");
  const tabs = isAdmin ? [...BASE_TABS, "admin"] : [...BASE_TABS];

  const go = (dir: 1 | -1) => {
    const state = navigation.getState?.();
    const current =
      state?.routeNames?.[state.index] ||
      state?.routes?.[state.index]?.name ||
      "index";
    const index = tabs.indexOf(current as (typeof tabs)[number]);
    if (index < 0) return;
    const next = tabs[index + dir];
    if (!next) return;
    if (typeof navigation.jumpTo === "function") {
      navigation.jumpTo(next);
    } else {
      navigation.navigate(next);
    }
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-36, 36])
    .onEnd((event) => {
      const flickedLeft = event.velocityX < -500;
      const flickedRight = event.velocityX > 500;
      if (event.translationX < -24 || flickedLeft) {
        runOnJS(go)(1);
      } else if (event.translationX > 24 || flickedRight) {
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
