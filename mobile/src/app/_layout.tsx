import React, { useEffect, useState, Component, type ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Platform, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useMobileStore } from "../store/useMobileStore";
import { AppLockGate } from "../components/AppLockGate";

// Prevent native splash screen from hiding before JS is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

let SystemUI: { setBackgroundColorAsync?: (color: string) => Promise<void> } | null = null;
try {
  SystemUI = require("expo-system-ui");
} catch {
  SystemUI = null;
}

let NavigationBar: {
  setPositionAsync?: (v: string) => Promise<void>;
  setBackgroundColorAsync?: (v: string) => Promise<void>;
  setButtonStyleAsync?: (v: string) => Promise<void>;
  setBehaviorAsync?: (v: string) => Promise<void>;
} | null = null;
try {
  NavigationBar = require("expo-navigation-bar");
} catch {
  NavigationBar = null;
}

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[RootErrorBoundary]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorTitle}>Server Gallery failed to start</Text>
          <Text style={styles.errorBody}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootLayoutInner() {
  const { initApp, authChecked } = useMobileStore();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        if (SystemUI?.setBackgroundColorAsync) {
          await SystemUI.setBackgroundColorAsync("#000000").catch(() => {});
        }

        if (Platform.OS === "android" && NavigationBar) {
          try {
            await NavigationBar.setBackgroundColorAsync?.("#00000000");
            await NavigationBar.setButtonStyleAsync?.("light");
          } catch {
            // Non-fatal on OEM skins / API mismatches
          }
        }

        await initApp();
      } catch (err) {
        console.error("[bootstrap]", err);
        // Ensure UI unlocks even if init throws
        useMobileStore.setState({
          authChecked: true,
          isAuthenticated: false,
          user: null,
        });
      } finally {
        if (!cancelled) {
          setBootstrapped(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [initApp]);

  const showLoading = !bootstrapped || !authChecked;

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppLockGate>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#000000" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="fullscreen-video"
          options={{
            headerShown: false,
            animation: "fade",
            gestureEnabled: false,
            contentStyle: { backgroundColor: "#000000" },
          }}
        />
      </Stack>

      {showLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingLabel}>Starting Server Gallery…</Text>
        </View>
      ) : null}
      </AppLockGate>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <RootLayoutInner />
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    zIndex: 100,
  },
  loadingLabel: {
    color: "#a3a3a3",
    fontSize: 14,
    marginTop: 4,
  },
  errorTitle: {
    color: "#fafafa",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  errorBody: {
    color: "#a3a3a3",
    fontSize: 13,
    textAlign: "center",
  },
});
