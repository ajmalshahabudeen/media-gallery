import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Server, CheckCircle2, AlertCircle, X } from "lucide-react-native";
import { pingServer } from "../lib/api";
import { useMobileStore } from "../store/useMobileStore";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ServerConfigModal: React.FC<Props> = ({ visible, onClose }) => {
  const { serverUrl, setServerUrl, checkAuth } = useMobileStore();
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await pingServer(urlInput);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = async () => {
    if (!urlInput.trim()) {
      Alert.alert("Error", "Please enter a valid server URL.");
      return;
    }
    await setServerUrl(urlInput.trim());
    await checkAuth();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Server size={20} color="#ffffff" />
              <Text style={styles.title}>Server URL Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#a3a3a3" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>LAN / Host Server Address</Text>
          <Text style={styles.subtitle}>
            Enter the IP address and port of your Media Gallery server on your local Wi-Fi network (e.g. http://192.168.1.101:38479).
          </Text>

          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://192.168.1.101:38479"
            placeholderTextColor="#737373"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {testResult && (
            <View
              style={[
                styles.resultCard,
                testResult.success ? styles.resultSuccess : styles.resultError,
              ]}
            >
              {testResult.success ? (
                <CheckCircle2 size={18} color="#22c55e" />
              ) : (
                <AlertCircle size={18} color="#ef4444" />
              )}
              <Text
                style={[
                  styles.resultText,
                  testResult.success ? styles.textSuccess : styles.textError,
                ]}
              >
                {testResult.message}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.testBtnText}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save & Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    backgroundColor: "#000000",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#171717",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fafafa",
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#a3a3a3",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#737373",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: "#171717",
    color: "#fafafa",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 12,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  resultSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderWidth: 1,
  },
  resultError: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
  },
  resultText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  textSuccess: {
    color: "#4ade80",
  },
  textError: {
    color: "#fca5a5",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  testBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#171717",
    alignItems: "center",
    justifyContent: "center",
  },
  testBtnText: {
    color: "#d4d4d4",
    fontWeight: "600",
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 13,
  },
});
