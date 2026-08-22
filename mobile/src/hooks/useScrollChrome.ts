import { useCallback, useRef, useState } from "react";
import { LayoutAnimation, Platform, UIManager } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import {
  FLOATING_TAB_BAR_STYLE,
  HIDDEN_TAB_BAR_STYLE,
} from "../components/tab-bar-style";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateChrome() {
  LayoutAnimation.configureNext({
    duration: 220,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}

export function useScrollChrome() {
  const navigation = useNavigation();
  const [chromeVisible, setChromeVisible] = useState(true);
  const lastOffsetY = useRef(0);
  const visibleRef = useRef(true);

  const applyTabBar = useCallback(
    (visible: boolean) => {
      animateChrome();
      navigation.setOptions({
        tabBarStyle: visible ? FLOATING_TAB_BAR_STYLE : HIDDEN_TAB_BAR_STYLE,
      });
    },
    [navigation]
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
          navigation.setOptions({ tabBarStyle: FLOATING_TAB_BAR_STYLE });
        } catch {
          // ignore
        }
      };
    }, [navigation, setVisible])
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
