import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Image as ImageIcon,
  Star,
  Settings,
  ShieldAlert,
  Clapperboard,
} from "lucide-react-native";
import { useMobileStore } from "../../store/useMobileStore";

export default function TabsLayout() {
  const { user } = useMobileStore();
  const isAdmin = user?.role === "admin";

  // Gallery + Reels + Favorites + Settings (+ Admin)
  const sideMargin = isAdmin ? 28 : 44;

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        tabBarShowLabel: false,
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 32,
                overflow: "hidden",
                backgroundColor: "rgba(15, 23, 42, 0.82)",
              },
            ]}
          >
            <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
          </View>
        ),
        tabBarStyle: {
          position: "absolute",
          bottom: 24,
          left: sideMargin,
          right: sideMargin,
          height: 60,
          borderRadius: 32,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.16)",
          paddingHorizontal: 8,
          elevation: 16,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.45,
          shadowRadius: 16,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          height: 60,
        },
        tabBarIconStyle: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#94a3b8",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Gallery",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : styles.inactivePill}>
              <ImageIcon size={22} color={focused ? "#818cf8" : "#94a3b8"} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="reels"
        options={{
          title: "Reels",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : styles.inactivePill}>
              <Clapperboard size={22} color={focused ? "#818cf8" : "#94a3b8"} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : styles.inactivePill}>
              <Star size={22} color={focused ? "#818cf8" : "#94a3b8"} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : styles.inactivePill}>
              <Settings size={22} color={focused ? "#818cf8" : "#94a3b8"} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activePill : styles.inactivePill}>
              <ShieldAlert size={22} color={focused ? "#818cf8" : "#94a3b8"} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activePill: {
    width: 48,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  inactivePill: {
    width: 48,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
});
