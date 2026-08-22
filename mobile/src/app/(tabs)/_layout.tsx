import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useMobileStore } from "../../store/useMobileStore";
import { FloatingTabBar } from "../../components/app-tabs";

export default function TabsLayout() {
  const { user, authChecked, isAuthenticated } = useMobileStore();

  if (authChecked && !isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const isAdmin = user?.role === "admin";

  return (
    <Tabs
      detachInactiveScreens={false}
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Gallery" }} />
      <Tabs.Screen name="reels" options={{ title: "Reels" }} />
      <Tabs.Screen name="favorites" options={{ title: "Saved" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}
