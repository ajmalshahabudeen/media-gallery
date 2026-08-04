import React, { useEffect, useState, Component, type ReactNode } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Platform, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useMobileStore } from "../store/useMobileStore";

// Keep splash visible until auth bootstrap finishes (production-safe).
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

export default function RootLayout() {
  const { initApp, isAuthenticated, authChecked } = useMobileStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        if (SystemUI?.setBackgroundColorAsync) {
          await SystemUI.setBackgroundColorAsync("#0f172a").catch(() => {});
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

  // Auth redirects only after navigator is mounted (prevents release crash-on-open).
  useEffect(() => {
    if (!bootstrapped || !authChecked) return;
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === "(auth)";

    try {
      const root = String(segments[0] ?? "");
      const atRootGate = root === "" || root === "index";

      if (!isAuthenticated && !inAuthGroup) {
        router.replace("/(auth)/sign-in");
      } else if (isAuthenticated && (inAuthGroup || atRootGate)) {
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("[auth-redirect]", err);
    }
  }, [bootstrapped, isAuthenticated, authChecked, segments, navigationState?.key, router]);

  const showLoading = !bootstrapped || !authChecked || !navigationState?.key;

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0f172a" },
            animation: "fade",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/sign-in" />
          <Stack.Screen name="(auth)/sign-up" />
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
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingLabel}>Starting Server Gallery…</Text>
          </View>
        ) : null}
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    zIndex: 100,
  },
  loadingLabel: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 4,
  },
  errorTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  errorBody: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
  },
});
