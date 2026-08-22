import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Image as ImageIcon,
  Clapperboard,
  Star,
  Settings,
  ShieldAlert,
} from "lucide-react-native";
import { useMobileStore } from "../store/useMobileStore";

type TabRoute = {
  key: string;
  name: string;
};

type TabDescriptor = {
  options?: {
    title?: string;
    href?: string | null;
    tabBarLabel?: string;
  };
};

export interface FloatingTabBarProps {
  state: {
    index: number;
    routes: TabRoute[];
  };
  descriptors: Record<string, TabDescriptor>;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

const ICONS: Record<string, typeof ImageIcon> = {
  index: ImageIcon,
  reels: Clapperboard,
  favorites: Star,
  settings: Settings,
  admin: ShieldAlert,
};

const LABELS: Record<string, string> = {
  index: "Gallery",
  reels: "Reels",
  favorites: "Saved",
  settings: "Settings",
  admin: "Admin",
};

export function FloatingTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const hidden = useMobileStore((s) => s.tabBarHidden);

  if (hidden) return null;

  const visibleRoutes = state.routes.filter((route: { key: string; name: string }) => {
    const href = descriptors[route.key]?.options?.href;
    return href !== null;
  });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 6 }]}>
      <View style={styles.dock}>
        <BlurView tint="dark" intensity={55} style={StyleSheet.absoluteFill} />
        <View style={styles.dockTint} />
        {visibleRoutes.map((route: { key: string; name: string }) => {
          const isFocused = state.routes[state.index]?.key === route.key;
          const Icon = ICONS[route.name] || ImageIcon;
          const label =
            descriptors[route.key]?.options?.title || LABELS[route.name] || route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.item}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <View style={[styles.orb, isFocused && styles.orbActive]}>
                <Icon
                  size={isFocused ? 18 : 20}
                  color={isFocused ? "#0b1220" : "rgba(226,232,240,0.55)"}
                  strokeWidth={isFocused ? 2.4 : 1.8}
                />
              </View>
              <Text style={[styles.label, isFocused && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default FloatingTabBar;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 18,
    right: 18,
    alignItems: "center",
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 440,
    height: 68,
    paddingHorizontal: 8,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: Platform.OS === "android" ? "rgba(8,10,16,0.92)" : "rgba(8,10,16,0.55)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 18,
  },
  dockTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8, 10, 16, 0.28)",
  },
  item: {
    flex: 1,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  orb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  orbActive: {
    backgroundColor: "#f8fafc",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  label: {
    fontSize: 9.5,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: "rgba(148,163,184,0.75)",
  },
  labelActive: {
    color: "#f8fafc",
    fontWeight: "700",
  },
});
