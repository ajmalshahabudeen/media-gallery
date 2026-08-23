import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs, Redirect } from "expo-router";
import {
  Image as ImageIcon,
  Star,
  Settings,
  ShieldAlert,
  Clapperboard,
} from "lucide-react-native";
import { useMobileStore } from "../../store/useMobileStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { instagramTabBarStyle } from "../../components/tab-bar-style";

function TabIcon({
  focused,
  Icon,
}: {
  focused: boolean;
  Icon: typeof ImageIcon;
}) {
  return (
    <View style={styles.orb}>
      <Icon
        size={24}
        color={focused ? "#000000" : "#a3a3a3"}
        fill={focused ? "#fafafa" : "transparent"}
        strokeWidth={focused ? 2.4 : 1.7}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { user, authChecked, isAuthenticated } = useMobileStore();
  const insets = useSafeAreaInsets();

  if (authChecked && !isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const isAdmin = user?.role === "admin";

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        tabBarShowLabel: false,
        animation: "none",
        tabBarHideOnKeyboard: true,
        tabBarStyle: instagramTabBarStyle(true, insets.bottom),
        tabBarItemStyle: {
          height: 48,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          margin: 0,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarIconStyle: {
          width: 28,
          height: 28,
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarLabelStyle: {
          display: "none",
          height: 0,
          fontSize: 0,
        },
        tabBarActiveTintColor: "#fafafa",
        tabBarInactiveTintColor: "#737373",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Gallery",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={ImageIcon} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: "Reels",
          lazy: true,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Clapperboard} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Saved",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Star} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={Settings} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} Icon={ShieldAlert} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  orb: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
