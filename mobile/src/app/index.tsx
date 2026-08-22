import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { Redirect } from "expo-router";
import { useMobileStore } from "../store/useMobileStore";
import { discoverServerUrl } from "../lib/network-scan";
import {
  getSavedLogin,
  markAutoLoginAttempted,
  wasAutoLoginAttempted,
} from "../lib/saved-login";
import { Palette } from "../constants/palette";

/**
 * Entry redirect gate.
 * Uses declarative <Redirect /> to prevent imperative navigation race condition crashes on release APKs.
 * Scans the LAN for Server Gallery first; if that fails the saved / default URL is kept.
 */
export default function IndexGate() {
  const { authChecked, isAuthenticated, setServerUrl, checkAuth, login } = useMobileStore();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Starting…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setStatus("Looking for Server Gallery on your Wi-Fi…");
        const discovered = await discoverServerUrl({ budgetMs: 9000 });
        if (cancelled) return;

        if (discovered.source === "scan") {
          setStatus("Found server. Connecting…");
          await setServerUrl(discovered.url);
          await checkAuth();
        }

        const state = useMobileStore.getState();
        if (!state.isAuthenticated && !wasAutoLoginAttempted()) {
          const saved = await getSavedLogin();
          if (saved?.email && saved.password) {
            markAutoLoginAttempted();
            setStatus(`Signing in as ${saved.email}…`);
            await login(saved.email, saved.password);
          }
        }
      } catch {
        // Keep current saved/default URL + existing auth redirect.
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [checkAuth, login, setServerUrl]);

  if (!authChecked || !ready) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={styles.status}>{status}</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  status: {
    color: Palette.mutedForeground,
    fontSize: 13,
    textAlign: "center",
  },
});
