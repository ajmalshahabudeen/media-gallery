import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FolderPlus, ImagePlus, Upload, X, Folder } from "lucide-react-native";
import { useMobileStore } from "../store/useMobileStore";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface PickedAsset {
  uri: string;
  name: string;
  type: string;
}

function guessName(asset: ImagePicker.ImagePickerAsset, index: number): string {
  if (asset.fileName) return asset.fileName;
  const uriName = asset.uri.split("/").pop() || "";
  if (uriName.includes(".")) return decodeURIComponent(uriName.split("?")[0]);
  const ext = asset.mimeType?.includes("video") ? "mp4" : "jpg";
  return `upload-${Date.now()}-${index}.${ext}`;
}

function guessType(asset: ImagePicker.ImagePickerAsset, name: string): string {
  if (asset.mimeType) return asset.mimeType;
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  if (asset.type === "video" || lower.match(/\.(mp4|mov|webm|mkv|m4v|avi)$/)) {
    return "video/mp4";
  }
  return "image/jpeg";
}

export function MediaUploadSheet({ visible, onClose }: Props) {
  const { folders, fetchSubfolders, createSubfolder, uploadMedia } = useMobileStore();

  const [libraryPath, setLibraryPath] = useState("");
  const [destPath, setDestPath] = useState("");
  const [subfolders, setSubfolders] = useState<{ name: string; path: string }[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [assets, setAssets] = useState<PickedAsset[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (folders.length === 0) return;
    const first = folders[0].path;
    setLibraryPath((prev) => prev || first);
    setDestPath((prev) => prev || first);
  }, [visible, folders]);

  useEffect(() => {
    if (!visible || !libraryPath) return;
    let cancelled = false;
    fetchSubfolders(libraryPath).then((result) => {
      if (cancelled) return;
      setSubfolders(result.filter((f) => f.path !== libraryPath));
      setDestPath((prev) => prev || libraryPath);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, libraryPath, fetchSubfolders]);

  const destOptions = useMemo(
    () => [{ name: "Library root", path: libraryPath }, ...subfolders],
    [libraryPath, subfolders]
  );

  const pickMedia = async () => {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 1,
      });
      if (result.canceled) return;
      const next = result.assets.map((asset, index) => {
        const name = guessName(asset, index);
        return {
          uri: asset.uri,
          name,
          type: guessType(asset, name),
        };
      });
      setAssets(next);
    } catch (err: any) {
      Alert.alert("Picker error", err?.message || "Could not open the photo library.");
    } finally {
      setPicking(false);
    }
  };

  const handleCreate = async () => {
    if (!newFolderName.trim() || !destPath) return;
    setCreating(true);
    const result = await createSubfolder(destPath, newFolderName.trim());
    setCreating(false);
    if (result.success && result.path) {
      const created = { name: newFolderName.trim(), path: result.path };
      setSubfolders((prev) => [...prev, created]);
      setDestPath(result.path);
      setNewFolderName("");
    } else {
      Alert.alert("Error", result.error || "Could not create folder.");
    }
  };

  const handleUpload = async () => {
    if (!libraryPath || !destPath) {
      Alert.alert("Choose a folder", "Pick a destination inside your media library.");
      return;
    }
    if (assets.length === 0) {
      Alert.alert("Nothing selected", "Select photos or videos first.");
      return;
    }
    setUploading(true);
    const result = await uploadMedia(libraryPath, destPath, assets);
    setUploading(false);
    if (result.success) {
      const extra = result.failed ? `\n${result.failed} skipped.` : "";
      Alert.alert("Uploaded", `${result.uploaded} file${result.uploaded === 1 ? "" : "s"} saved.${extra}`);
      setAssets([]);
      onClose();
    } else {
      Alert.alert("Upload failed", result.error || "Could not upload files.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Upload photos & videos</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Media library</Text>
            {folders.map((folder) => {
              const active = libraryPath === folder.path;
              return (
                <TouchableOpacity
                  key={folder.id}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    setLibraryPath(folder.path);
                    setDestPath(folder.path);
                  }}
                >
                  <Folder size={16} color={active ? "#818cf8" : "#94a3b8"} />
                  <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                    {folder.name || folder.path}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.label}>Upload into</Text>
            {destOptions.map((folder) => {
              const active = destPath === folder.path;
              return (
                <TouchableOpacity
                  key={folder.path}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => setDestPath(folder.path)}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                    {folder.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.label}>Create folder (optional)</Text>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Vacation 2026"
                placeholderTextColor="#64748b"
                value={newFolderName}
                onChangeText={setNewFolderName}
              />
              <TouchableOpacity
                style={styles.iconAction}
                onPress={handleCreate}
                disabled={creating || !newFolderName.trim()}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <FolderPlus size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.pickBtn} onPress={pickMedia} disabled={picking}>
              {picking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ImagePlus size={18} color="#fff" />
              )}
              <Text style={styles.pickBtnText}>
                {assets.length > 0
                  ? `${assets.length} selected — change`
                  : "Select photos & videos"}
              </Text>
            </TouchableOpacity>

            {assets.map((asset) => (
              <View key={asset.uri} style={styles.assetRow}>
                <Text style={styles.assetName} numberOfLines={1}>
                  {asset.name}
                </Text>
                <TouchableOpacity onPress={() => setAssets((prev) => prev.filter((a) => a.uri !== asset.uri))}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.uploadBtn, (uploading || assets.length === 0) && styles.uploadBtnDisabled]}
              onPress={handleUpload}
              disabled={uploading || assets.length === 0}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Upload size={18} color="#fff" />
              )}
              <Text style={styles.uploadBtnText}>{uploading ? "Uploading..." : "Upload"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: "#334155",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc",
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    marginTop: 14,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 6,
  },
  optionActive: {
    borderColor: "#6366f1",
    backgroundColor: "rgba(79, 70, 229, 0.15)",
  },
  optionText: {
    flex: 1,
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  optionTextActive: {
    color: "#f8fafc",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#334155",
    height: 44,
  },
  iconAction: {
    backgroundColor: "#6366f1",
    width: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  pickBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#334155",
    paddingVertical: 12,
    borderRadius: 12,
  },
  pickBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  assetName: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 12,
    marginRight: 10,
  },
  uploadBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
