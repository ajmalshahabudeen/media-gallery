import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Users,
  Shield,
  FileText,
  UserCheck,
  UserX,
  Trash2,
  X,
  AlertTriangle,
  Info,
} from "lucide-react-native";
import { apiFetch } from "../../lib/api";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
}

interface SystemLogItem {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  type: string;
  message: string;
  userEmail: string | null;
  ipAddress: string | null;
  metadata: string | null;
}

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SystemLogItem | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else {
      fetchLogs();
    }
  }, [activeTab]);

  const handleToggleRole = async (user: UserItem) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      const res = await apiFetch(`/api/admin/users?id=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch {
      // ignore
    }
  };

  const handleToggleBan = async (user: UserItem) => {
    const banned = !user.banned;
    try {
      const res = await apiFetch(`/api/admin/users?id=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteUser = (user: UserItem) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete user ${user.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await apiFetch(`/api/admin/users?id=${user.id}`, {
              method: "DELETE",
            });
            fetchUsers();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>

        {/* Tab switcher */}
        <View style={styles.tabToggle}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "users" && styles.tabBtnActive]}
            onPress={() => setActiveTab("users")}
          >
            <Users size={14} color={activeTab === "users" ? "#ffffff" : "#94a3b8"} />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "users" && styles.tabBtnTextActive,
              ]}
            >
              Users ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "logs" && styles.tabBtnActive]}
            onPress={() => setActiveTab("logs")}
          >
            <FileText size={14} color={activeTab === "logs" ? "#ffffff" : "#94a3b8"} />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "logs" && styles.tabBtnTextActive,
              ]}
            >
              System Logs ({logs.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color="#818cf8" />
        </View>
      ) : activeTab === "users" ? (
        /* Users Tab */
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userInfoRow}>
                <View style={styles.userHeaderInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>

                {item.role === "admin" && (
                  <View style={styles.roleBadge}>
                    <Shield size={10} color="#c084fc" />
                    <Text style={styles.roleBadgeText}>ADMIN</Text>
                  </View>
                )}
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => handleToggleRole(item)}
                >
                  <Shield size={12} color="#818cf8" />
                  <Text style={styles.actionPillText}>
                    {item.role === "admin" ? "Demote to User" : "Promote to Admin"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, item.banned && styles.actionPillDanger]}
                  onPress={() => handleToggleBan(item)}
                >
                  {item.banned ? (
                    <UserCheck size={12} color="#4ade80" />
                  ) : (
                    <UserX size={12} color="#f87171" />
                  )}
                  <Text
                    style={[
                      styles.actionPillText,
                      item.banned && styles.textSuccess,
                    ]}
                  >
                    {item.banned ? "Unban" : "Ban"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteIconBtn}
                  onPress={() => handleDeleteUser(item)}
                >
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        /* System Logs Tab */
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.logCard}
              onPress={() => setSelectedLog(item)}
              activeOpacity={0.7}
            >
              <View style={styles.logTopRow}>
                <View
                  style={[
                    styles.levelBadge,
                    item.level === "ERROR"
                      ? styles.levelError
                      : item.level === "WARN"
                      ? styles.levelWarn
                      : styles.levelInfo,
                  ]}
                >
                  <Text
                    style={[
                      styles.levelBadgeText,
                      item.level === "ERROR"
                        ? styles.textError
                        : item.level === "WARN"
                        ? styles.textWarn
                        : styles.textInfo,
                    ]}
                  >
                    {item.level}
                  </Text>
                </View>

                <Text style={styles.logType}>{item.type}</Text>
                <Text style={styles.logTime}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>

              <Text style={styles.logMessage} numberOfLines={2}>
                {item.message}
              </Text>

              {item.userEmail && (
                <Text style={styles.logSubText}>User: {item.userEmail}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Log Details Modal */}
      <Modal visible={!!selectedLog} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Record Details</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.logLabel}>Message:</Text>
                <Text style={styles.logVal}>{selectedLog.message}</Text>

                <Text style={styles.logLabel}>Type & Level:</Text>
                <Text style={styles.logVal}>
                  {selectedLog.type} ({selectedLog.level})
                </Text>

                <Text style={styles.logLabel}>User Email / IP:</Text>
                <Text style={styles.logVal}>
                  {selectedLog.userEmail || "System"} • {selectedLog.ipAddress || "LAN"}
                </Text>

                <Text style={styles.logLabel}>Timestamp:</Text>
                <Text style={styles.logVal}>
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </Text>

                {selectedLog.metadata ? (
                  <>
                    <Text style={styles.logLabel}>Metadata JSON:</Text>
                    <Text style={styles.jsonBox}>{selectedLog.metadata}</Text>
                  </>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 12,
  },
  tabToggle: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#4f46e5",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  tabBtnTextActive: {
    color: "#ffffff",
  },
  loadingArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listPadding: {
    padding: 16,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  userInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userHeaderInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
  },
  userEmail: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#c084fc",
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#334155",
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionPillDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#cbd5e1",
  },
  textSuccess: {
    color: "#4ade80",
  },
  deleteIconBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  logCard: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  logTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelInfo: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  levelWarn: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
  },
  levelError: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textInfo: {
    color: "#60a5fa",
  },
  textWarn: {
    color: "#facc15",
  },
  textError: {
    color: "#fca5a5",
  },
  logType: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    flex: 1,
  },
  logTime: {
    fontSize: 10,
    color: "#64748b",
  },
  logMessage: {
    fontSize: 13,
    color: "#f1f5f9",
    lineHeight: 18,
  },
  logSubText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 20,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  modalScroll: {},
  logLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#818cf8",
    marginTop: 10,
  },
  logVal: {
    fontSize: 13,
    color: "#e2e8f0",
    marginTop: 2,
  },
  jsonBox: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#38bdf8",
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
});
