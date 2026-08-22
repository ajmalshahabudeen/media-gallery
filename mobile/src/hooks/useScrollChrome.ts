import { useCallback, useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import {
  FLOATING_TAB_BAR_STYLE,
  HIDDEN_TAB_BAR_STYLE,
} from "../components/tab-bar-style";

export function useScrollChrome() {
  const navigation = useNavigation();
  const [chromeVisible, setChromeVisible] = useState(true);
  const lastOffsetY = useRef(0);

  useFocusEffect(
    useCallback(() => {
      setChromeVisible(true);
      navigation.setOptions({ tabBarStyle: FLOATING_TAB_BAR_STYLE });
      return () => {
        try {
          navigation.setOptions({ tabBarStyle: FLOATING_TAB_BAR_STYLE });
        } catch {
          // ignore
        }
      };
    }, [navigation])
  );

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: chromeVisible ? FLOATING_TAB_BAR_STYLE : HIDDEN_TAB_BAR_STYLE,
    });
  }, [chromeVisible, navigation]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const delta = y - lastOffsetY.current;
    if (Math.abs(delta) < 8) return;
    if (delta > 0 && y > 24) {
      setChromeVisible(false);
    } else if (delta < 0) {
      setChromeVisible(true);
    }
    lastOffsetY.current = y;
  }, []);

  return { chromeVisible, onScroll };
}
