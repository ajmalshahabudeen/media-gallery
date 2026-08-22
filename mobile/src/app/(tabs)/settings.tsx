import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  FolderPlus,
  Trash2,
  Server,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Shield,
  Folder,
  Upload,
  LayoutGrid,
  Newspaper,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMobileStore } from "../../store/useMobileStore";
import { ServerConfigModal } from "../../components/ServerConfigModal";
import { MediaUploadSheet } from "../../components/MediaUploadSheet";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    user,
    serverUrl,
    folders,
    addFolder,
    removeFolder,
    scanMedia,
    isScanning,
    logout,
    galleryLayout,
    setGalleryLayout,
  } = useMobileStore();

  const [folderInput, setFolderInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleAddFolder = async () => {
    if (!folderInput.trim()) {
      Alert.alert("Error", "Please enter a folder path.");
      return;
    }
    setAdding(true);
    const res = await addFolder(folderInput.trim());
    setAdding(false);

    if (res.success) {
      setFolderInput("");
      Alert.alert("Success", "Media folder added!");
    } else {
      Alert.alert("Error", res.error || "Could not add folder. Check server permissions.");
    }
  };

  const handleRemoveFolder = (id: string, name?: string) => {
    Alert.alert(
      "Remove Folder",
      `Are you sure you want to remove ${name || "this folder"} from Media Library?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeFolder(id);
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text style={styles.title}>Settings</Text>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <UserIcon size={24} color="#fafafa" />
            </View>

            <View style={styles.profileDetails}>
              <Text style={styles.userName}>{user?.name || "User"}</Text>
              <Text style={styles.userEmail}>{user?.email || "user@example.com"}</Text>
              {user?.role === "admin" && (
                <View style={styles.adminBadge}>
                  <Shield size={10} color="#a855f7" />
                  <Text style={styles.adminBadgeText}>ADMINISTRATOR</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Server Connection Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Server size={18} color="#fafafa" />
            <Text style={styles.cardTitle}>LAN Server Settings</Text>
          </View>

          <Text style={styles.serverUrlText} numberOfLines={1}>
            {serverUrl}
          </Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowServerModal(true)}
          >
            <Text style={styles.actionBtnText}>Configure / Test Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Home layout — mobile only */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Newspaper size={18} color="#fafafa" />
            <Text style={styles.cardTitle}>Home layout</Text>
          </View>
          <Text style={styles.cardSub}>
            Switch the gallery between the classic cards view and a tight Instagram-style square grid.
          </Text>
          <View style={styles.layoutRow}>
            <TouchableOpacity
              style={[styles.layoutChoice, galleryLayout === "grid" && styles.layoutChoiceActive]}
              onPress={() => setGalleryLayout("grid")}
            >
              <LayoutGrid size={16} color={galleryLayout === "grid" ? "#000000" : "#a3a3a3"} />
              <Text
                style={[
                  styles.layoutChoiceText,
                  galleryLayout === "grid" && styles.layoutChoiceTextActive,
                ]}
              >
                Gallery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.layoutChoice, galleryLayout === "feed" && styles.layoutChoiceActive]}
              onPress={() => setGalleryLayout("feed")}
            >
              <Newspaper size={16} color={galleryLayout === "feed" ? "#000000" : "#a3a3a3"} />
              <Text
                style={[
                  styles.layoutChoiceText,
                  galleryLayout === "feed" && styles.layoutChoiceTextActive,
                ]}
              >
                Instagram grid
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Media Folders Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Folder size={18} color="#fafafa" />
            <Text style={styles.cardTitle}>Media Library Folders</Text>
          </View>

          <Text style={styles.cardSub}>
            Folders configured on your host server for indexing photos, videos, and music.
          </Text>

          {/* Add Folder Form */}
          <View style={styles.addFolderRow}>
            <TextInput
              style={styles.folderInput}
              placeholder="e.g. C:\Media or /host_drives/c/Media"
              placeholderTextColor="#737373"
              value={folderInput}
              onChangeText={setFolderInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAddFolder}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <FolderPlus size={18} color="#000000" />
              )}
            </TouchableOpacity>
          </View>

          {/* Folders List */}
          {folders.map((f) => (
            <View key={f.id} style={styles.folderItem}>
              <View style={styles.folderInfo}>
                <Text style={styles.folderPath} numberOfLines={1}>
                  {f.path}
                </Text>
                {f.name ? <Text style={styles.folderName}>{f.name}</Text> : null}
              </View>

              <TouchableOpacity
                onPress={() => handleRemoveFolder(f.id, f.name || f.path)}
                style={styles.deleteFolderBtn}
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {folders.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Upload size={18} color="#fafafa" />
              <Text style={styles.cardTitle}>Upload photos & videos</Text>
            </View>
            <Text style={styles.cardSub}>
              Choose or create a folder inside your media library, then pick multiple photos or videos.
            </Text>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowUpload(true)}>
              <Text style={styles.actionBtnText}>Choose folder & upload</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan Actions */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => scanMedia(true)}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#000000" size="small" />
          ) : (
            <RefreshCw size={18} color="#000000" />
          )}
          <Text style={styles.scanBtnText}>
            {isScanning ? "Scanning Media Library..." : "Trigger Full Library Rescan"}
          </Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <ServerConfigModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
      <MediaUploadSheet visible={showUpload} onClose={() => setShowUpload(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fafafa",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#171717",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#171717",
    borderColor: "#262626",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fafafa",
  },
  userEmail: {
    fontSize: 12,
    color: "#a3a3a3",
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#c084fc",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fafafa",
  },
  cardSub: {
    fontSize: 12,
    color: "#737373",
    marginBottom: 12,
  },
  serverUrlText: {
    fontSize: 13,
    color: "#d4d4d4",
    backgroundColor: "#000000",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionBtn: {
    backgroundColor: "#262626",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fafafa",
    fontSize: 13,
    fontWeight: "600",
  },
  layoutRow: {
    flexDirection: "row",
    gap: 8,
  },
  layoutChoice: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#000000",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
  },
  layoutChoiceActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  layoutChoiceText: {
    color: "#a3a3a3",
    fontSize: 13,
    fontWeight: "700",
  },
  layoutChoiceTextActive: {
    color: "#000000",
  },
  addFolderRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  folderInput: {
    flex: 1,
    backgroundColor: "#000000",
    color: "#fafafa",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#262626",
  },
  addBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  folderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000000",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  folderInfo: {
    flex: 1,
    marginRight: 10,
  },
  folderPath: {
    fontSize: 12,
    color: "#e5e5e5",
  },
  folderName: {
    fontSize: 10,
    color: "#737373",
    marginTop: 2,
  },
  deleteFolderBtn: {
    padding: 6,
  },
  scanBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  scanBtnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
  },
  signOutBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 12,
    borderRadius: 12,
  },
  signOutBtnText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
});
