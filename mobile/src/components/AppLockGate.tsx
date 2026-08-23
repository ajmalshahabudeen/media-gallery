import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Lock } from "lucide-react-native";
import { useMobileStore } from "../store/useMobileStore";
import { promptDeviceLock } from "../lib/app-lock";

let suppressLockCount = 0;

/** Call around system UI that backgrounds the app (photo picker, etc.). */
export function beginExternalActivity() {
  suppressLockCount += 1;
}

export function endExternalActivity() {
  suppressLockCount = Math.max(0, suppressLockCount - 1);
}

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const appLockEnabled = useMobileStore((s) => s.appLockEnabled);
  const authChecked = useMobileStore((s) => s.authChecked);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const authenticating = useRef(false);
  const hydrated = useRef(false);

  const unlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    setBusy(true);
    const result = await promptDeviceLock("Unlock Server Gallery");
    authenticating.current = false;
    setBusy(false);
    if (result.success) setLocked(false);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!hydrated.current) {
      hydrated.current = true;
      if (appLockEnabled) setLocked(true);
      return;
    }
    if (!appLockEnabled) setLocked(false);
  }, [authChecked, appLockEnabled]);

  useEffect(() => {
    if (locked && appLockEnabled && authChecked) {
      void unlock();
    }
  }, [locked, appLockEnabled, authChecked, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;
      if (!appLockEnabled) return;
      if (authenticating.current || suppressLockCount > 0) return;
      if (prev === "background" && next === "active") {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [appLockEnabled]);

  return (
    <View style={styles.root}>
      {children}
      {locked && appLockEnabled ? (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Lock size={28} color="#fafafa" />
            </View>
            <Text style={styles.title}>App locked</Text>
            <Text style={styles.body}>Use your device screen lock to continue.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => void unlock()} disabled={busy}>
              <Text style={styles.btnText}>{busy ? "Waiting…" : "Unlock"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    color: "#fafafa",
    fontSize: 22,
    fontWeight: "800",
  },
  body: {
    color: "#a3a3a3",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 160,
    alignItems: "center",
  },
  btnText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
