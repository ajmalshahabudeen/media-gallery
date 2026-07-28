import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Image as ImageIcon, Star, Settings, ShieldAlert } from "lucide-react-native";
import { useMobileStore } from "../../store/useMobileStore";

export default function TabsLayout() {
  const { user } = useMobileStore();
  const isAdmin = user?.role === "admin";

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 31,
                overflow: "hidden",
              },
            ]}
          >
            <BlurView
              tint="dark"
              intensity={80}
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "rgba(15, 23, 42, 0.75)",
                },
              ]}
            />
          </View>
        ),
        tabBarStyle: {
          position: "absolute",
          bottom: 24,
          left: 28,
          right: 28,
          height: 62,
          borderRadius: 31,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          borderWidth: 1.5,
          borderColor: "rgba(255, 255, 255, 0.2)",
          paddingBottom: 6,
          paddingTop: 6,
          elevation: 16,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.5,
          shadowRadius: 18,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarActiveTintColor: "#a5b4fc",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Gallery",
          tabBarIcon: ({ color, size }) => <ImageIcon size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color, size }) => <Star size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <ShieldAlert size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
