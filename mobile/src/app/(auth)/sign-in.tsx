import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Lock, Mail, Server, User as UserIcon, X } from "lucide-react-native";
import { useMobileStore } from "../../store/useMobileStore";
import { ServerConfigModal } from "../../components/ServerConfigModal";
import { clearSavedLogin, getSavedLogin, type SavedLogin } from "../../lib/saved-login";
import { Palette } from "../../constants/palette";

export default function SignInScreen() {
  const router = useRouter();
  const { login, serverUrl } = useMobileStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [saved, setSaved] = useState<SavedLogin | null>(null);
  const [useSavedCard, setUseSavedCard] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await getSavedLogin();
      if (cancelled || !stored) return;
      setSaved(stored);
      setUseSavedCard(true);
      setEmail(stored.email);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignIn = async (creds?: { email: string; password: string }) => {
    const nextEmail = (creds?.email ?? email).trim();
    const nextPassword = (creds?.password ?? password).trim();
    if (!nextEmail || !nextPassword) {
      Alert.alert("Error", "Please fill in email and password.");
      return;
    }
    setLoading(true);
    const result = await login(nextEmail, nextPassword);
    setLoading(false);

    if (result.success) {
      router.replace("/(tabs)" as any);
    } else {
      Alert.alert("Could not sign in", result.error || "Check the server IP and try again.");
    }
  };

  const handleForgetAccount = () => {
    Alert.alert("Remove saved account", "This removes the saved login from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await clearSavedLogin();
          setSaved(null);
          setUseSavedCard(false);
          setEmail("");
          setPassword("");
        },
      },
    ]);
  };

  const initial = (saved?.name || saved?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.brandContainer}>
          <Image
            source={require("@/assets/images/splash-icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Server Gallery</Text>
          <Text style={styles.brandSub}>Local Network Media Server</Text>
        </View>

        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setShowConfig(true)}
          activeOpacity={0.7}
        >
          <Server size={14} color={Palette.foreground} />
          <Text style={styles.serverPillText} numberOfLines={1}>
            Server: {serverUrl}
          </Text>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        {useSavedCard && saved ? (
          <View style={styles.savedCard}>
            <View style={styles.savedRow}>
              <View style={styles.savedAvatar}>
                <Text style={styles.savedInitial}>{initial}</Text>
              </View>
              <View style={styles.savedMeta}>
                <Text style={styles.savedName}>{saved.name || saved.email}</Text>
                {saved.name ? <Text style={styles.savedEmail}>{saved.email}</Text> : null}
              </View>
              <TouchableOpacity onPress={handleForgetAccount} hitSlop={10}>
                <X size={16} color={Palette.mutedForeground} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => handleSignIn({ email: saved.email, password: saved.password })}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Palette.primaryForeground} />
              ) : (
                <Text style={styles.submitBtnText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchAccountBtn}
              onPress={() => {
                setUseSavedCard(false);
                setEmail(saved.email);
                setPassword("");
              }}
              disabled={loading}
            >
              <Text style={styles.switchAccountText}>Use another account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {saved ? (
              <TouchableOpacity
                style={styles.savedHint}
                onPress={() => setUseSavedCard(true)}
                activeOpacity={0.8}
              >
                <UserIcon size={16} color={Palette.foreground} />
                <Text style={styles.savedHintText}>Saved account: {saved.email}</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.inputWrapper}>
              <Mail size={18} color={Palette.placeholder} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Palette.placeholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={18} color={Palette.placeholder} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Palette.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={() => handleSignIn()} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Palette.primaryForeground} />
              ) : (
                <Text style={styles.submitBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        )}
      </View>

      <ServerConfigModal visible={showConfig} onClose={() => setShowConfig(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Palette.foreground,
  },
  brandSub: {
    fontSize: 13,
    color: Palette.mutedForeground,
    marginTop: 4,
  },
  serverPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: Palette.cardElevated,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 24,
  },
  serverPillText: {
    fontSize: 12,
    color: Palette.ring,
    maxWidth: 200,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Palette.foreground,
  },
  savedCard: {
    width: "100%",
    backgroundColor: Palette.cardElevated,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  savedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  savedInitial: {
    color: Palette.primaryForeground,
    fontSize: 18,
    fontWeight: "800",
  },
  savedMeta: {
    flex: 1,
  },
  savedName: {
    color: Palette.foreground,
    fontSize: 16,
    fontWeight: "700",
  },
  savedEmail: {
    color: Palette.mutedForeground,
    fontSize: 12,
    marginTop: 2,
  },
  switchAccountBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  switchAccountText: {
    color: Palette.mutedForeground,
    fontSize: 13,
    fontWeight: "600",
  },
  savedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Palette.cardElevated,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  savedHintText: {
    color: Palette.foreground,
    fontSize: 13,
    fontWeight: "600",
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Palette.foreground,
    fontSize: 14,
    paddingVertical: 12,
  },
  submitBtn: {
    backgroundColor: Palette.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: Palette.primaryForeground,
    fontSize: 15,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: Palette.mutedForeground,
    fontSize: 13,
  },
  linkText: {
    color: Palette.foreground,
    fontSize: 13,
    fontWeight: "700",
  },
});
