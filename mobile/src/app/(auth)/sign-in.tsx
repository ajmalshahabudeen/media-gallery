import React, { useState } from "react";
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
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Lock, Mail, Server, Image as ImageIcon } from "lucide-react-native";
import { useMobileStore } from "../../store/useMobileStore";
import { ServerConfigModal } from "../../components/ServerConfigModal";

export default function SignInScreen() {
  const router = useRouter();
  const { login, serverUrl } = useMobileStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in email and password.");
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password.trim());
    setLoading(false);

    if (result.success) {
      router.replace("/(tabs)" as any);
    } else {
      Alert.alert("Sign In Failed", result.error || "Please check credentials and server URL.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <ImageIcon size={32} color="#818cf8" />
          </View>
          <Text style={styles.brandTitle}>Media Gallery</Text>
          <Text style={styles.brandSub}>Local Network Media Server</Text>
        </View>

        {/* Server IP Pill */}
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setShowConfig(true)}
          activeOpacity={0.7}
        >
          <Server size={14} color="#818cf8" />
          <Text style={styles.serverPillText} numberOfLines={1}>
            Server: {serverUrl}
          </Text>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>

        {/* Form Inputs */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Mail size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={18} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
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
      </View>

      <ServerConfigModal visible={showConfig} onClose={() => setShowConfig(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
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
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1e1b4b",
    borderColor: "#4338ca",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f8fafc",
  },
  brandSub: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
  },
  serverPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 24,
  },
  serverPillText: {
    fontSize: 12,
    color: "#cbd5e1",
    maxWidth: 200,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#818cf8",
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 14,
    paddingVertical: 12,
  },
  submitBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  linkText: {
    color: "#818cf8",
    fontSize: 13,
    fontWeight: "700",
  },
});
