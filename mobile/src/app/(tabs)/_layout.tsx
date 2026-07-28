import React from "react";
import { Tabs } from "expo-router";
import { Image as ImageIcon, Star, Settings, ShieldAlert } from "lucide-react-native";
import { useMobileStore } from "../../store/useMobileStore";

export default function TabsLayout() {
  const { user } = useMobileStore();
  const isAdmin = user?.role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0f172a",
          borderTopColor: "#1e293b",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
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
          href: isAdmin ? "/admin" : null,
          tabBarIcon: ({ color, size }) => <ShieldAlert size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
