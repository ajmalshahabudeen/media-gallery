import { useCallback, useRef, useState } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { instagramTabBarStyle } from "../components/tab-bar-style";

try {
  if (
    Platform.OS === "android" &&
    typeof UIManager?.setLayoutAnimationEnabledExperimental === "function"
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
} catch {
  // Non-fatal on New Architecture / Fabric where LayoutAnimation is built-in
}

function animateChrome() {
  try {
    LayoutAnimation.configureNext({
      duration: 220,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  } catch {
    // Non-fatal if layout animation is unavailable
  }
}

export function useScrollChrome() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [chromeVisible, setChromeVisible] = useState(true);
  const lastOffsetY = useRef(0);
  const visibleRef = useRef(true);

  const applyTabBar = useCallback(
    (visible: boolean) => {
      animateChrome();
      navigation.setOptions({
        tabBarStyle: instagramTabBarStyle(visible, insets.bottom),
      });
    },
    [navigation, insets.bottom]
  );

  const setVisible = useCallback(
    (visible: boolean) => {
      if (visibleRef.current === visible) return;
      visibleRef.current = visible;
      setChromeVisible(visible);
      applyTabBar(visible);
    },
    [applyTabBar]
  );

  useFocusEffect(
    useCallback(() => {
      setVisible(true);
      return () => {
        try {
          navigation.setOptions({ tabBarStyle: instagramTabBarStyle(true, insets.bottom) });
        } catch {
          // ignore
        }
      };
    }, [navigation, setVisible, insets.bottom])
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const y = contentOffset.y;
      const delta = y - lastOffsetY.current;
      const atTop = y <= 16;
      const atBottom =
        y + layoutMeasurement.height >= contentSize.height - 28;

      if (atTop) {
        setVisible(true);
        lastOffsetY.current = y;
        return;
      }

      if (Math.abs(delta) < 6) return;

      if (delta > 0) {
        setVisible(false);
      } else if (delta < 0 && !atBottom) {
        setVisible(true);
      }

      lastOffsetY.current = y;
    },
    [setVisible]
  );

  return { chromeVisible, onScroll };
}
