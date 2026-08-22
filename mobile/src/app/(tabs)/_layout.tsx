import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Image as ImageIcon,
  Star,
  Settings,
  ShieldAlert,
  Clapperboard,
} from "lucide-react-native";
import { useMobileStore } from "../../store/useMobileStore";
import { FLOATING_TAB_BAR_STYLE } from "../../components/tab-bar-style";
import { SwipeableTabScreen } from "../../components/SwipeableTabScreen";

function TabIcon({
  focused,
  Icon,
}: {
  focused: boolean;
  Icon: typeof ImageIcon;
}) {
  return (
    <View style={focused ? styles.orbActive : styles.orb}>
      <Icon
        size={20}
        color={focused ? "#000000" : "#a3a3a3"}
        strokeWidth={focused ? 2.3 : 1.8}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { user, authChecked, isAuthenticated } = useMobileStore();

  if (authChecked && !isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const isAdmin = user?.role === "admin";

  return (
    <Tabs
      detachInactiveScreens={false}
      screenLayout={({ children }) => <SwipeableTabScreen>{children}</SwipeableTabScreen>}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        tabBarShowLabel: false,
        animation: "none",
        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.dockClip]}
          >
            <BlurView tint="dark" intensity={70} style={StyleSheet.absoluteFill} />
            <View style={styles.dockTint} />
          </View>
        ),
        tabBarStyle: FLOATING_TAB_BAR_STYLE,
        tabBarItemStyle: {
          height: 58,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          margin: 0,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarIconStyle: {
          width: 40,
          height: 40,
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarLabelStyle: {
          display: "none",
          height: 0,
          fontSize: 0,
        },
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#a3a3a3",
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
  dockClip: {
    borderRadius: 29,
    overflow: "hidden",
    backgroundColor: "rgba(8, 10, 16, 0.82)",
  },
  dockTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(8, 10, 16, 0.22)",
  },
  orb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  orbActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
  },
});
