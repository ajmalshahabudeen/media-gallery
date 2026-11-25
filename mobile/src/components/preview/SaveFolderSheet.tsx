import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Bookmark, Check, FolderPlus, Plus, Trash2, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildThumbnailUrl } from "../../lib/api";
import {
  useMobileStore,
  type MediaFile,
  type SaveFolderItem,
} from "../../store/useMobileStore";

interface SaveToastProps {
  visible: boolean;
  file: MediaFile | null;
  folderName: string;
  bottomOffset?: number;
  onSaveToFolder: () => void;
  onDismiss: () => void;
}

export function SaveToastBanner({
  visible,
  file,
  folderName,
  bottomOffset = 42,
  onSaveToFolder,
  onDismiss,
}: SaveToastProps) {
  const { serverUrl, sessionToken } = useMobileStore();
  if (!visible || !file) return null;

  const thumbUrl = buildThumbnailUrl(serverUrl, file.path, sessionToken);

  return (
    <View style={[styles.toastWrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View style={styles.toastCard}>
        <View style={styles.toastLeft}>
          <Image
            source={{ uri: thumbUrl }}
            style={styles.toastThumb}
            contentFit="cover"
          />
          <View style={styles.toastTextWrap}>
            <Text style={styles.toastTitle} numberOfLines={1}>
              Saved to {folderName}
            </Text>
            <Text style={styles.toastSub} numberOfLines={1}>
              Long-press bookmark to view all saved
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.toastActionBtn}
          onPress={() => {
            onDismiss();
            onSaveToFolder();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.toastActionText}>Save to folder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface SaveFolderSheetProps {
  visible: boolean;
  file: MediaFile | null;
  openedFromToast?: boolean;
  onClose: () => void;
}

export function SaveFolderSheet({
  visible,
  file,
  openedFromToast = false,
  onClose,
}: SaveFolderSheetProps) {
  const insets = useSafeAreaInsets();
  const {
    serverUrl,
    sessionToken,
    saveFolders,
    savedMedia,
    toggleMediaInSaveFolder,
    createSaveFolder,
    unsaveMedia,
  } = useMobileStore();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movedFromDefaultOnce, setMovedFromDefaultOnce] = useState(false);

  const savedRecord = file ? savedMedia.find((item) => item.path === file.path) : undefined;
  const activeFolderIds = new Set(savedRecord?.folderIds || []);

  const resetAndClose = () => {
    setCreating(false);
    setNewName("");
    setError(null);
    setMovedFromDefaultOnce(false);
    onClose();
  };

  const handleToggleFolder = async (folder: SaveFolderItem) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    const shouldMoveFromDefault =
      openedFromToast && !movedFromDefaultOnce && !folder.isDefault;
    await toggleMediaInSaveFolder(file, folder.id, shouldMoveFromDefault);
    if (shouldMoveFromDefault) {
      setMovedFromDefaultOnce(true);
    }
    setBusy(false);
  };

  const handleCreateFolder = async () => {
    const trimmed = newName.trim();
    if (!trimmed || !file || busy) return;
    setBusy(true);
    setError(null);
    const shouldMoveFromDefault = openedFromToast && !movedFromDefaultOnce;
    const res = await createSaveFolder(trimmed, file, shouldMoveFromDefault);
    setBusy(false);
    if (!res.success) {
      setError(res.error || "Could not create folder");
      return;
    }
    if (shouldMoveFromDefault) {
      setMovedFromDefaultOnce(true);
    }
    setNewName("");
    setCreating(false);
  };

  const handleUnsaveAll = async () => {
    if (!file || busy) return;
    setBusy(true);
    await unsaveMedia(file.path);
    setBusy(false);
    resetAndClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={resetAndClose}
        />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Save to</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.newFolderChip}
                onPress={() => {
                  setCreating((v) => !v);
                  setError(null);
                }}
                activeOpacity={0.8}
              >
                <Plus size={15} color="#fafafa" />
                <Text style={styles.newFolderChipText}>New folder</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={resetAndClose}
                hitSlop={10}
              >
                <X size={20} color="#a3a3a3" />
              </TouchableOpacity>
            </View>
          </View>

          {creating ? (
            <View style={styles.createBox}>
              <View style={styles.createRow}>
                <FolderPlus size={18} color="#a3a3a3" />
                <TextInput
                  style={styles.input}
                  placeholder="Collection name (stored in DB only)"
                  placeholderTextColor="#737373"
                  value={newName}
                  onChangeText={setNewName}
                  maxLength={60}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => void handleCreateFolder()}
                />
                <TouchableOpacity
                  style={[
                    styles.createSaveBtn,
                    (!newName.trim() || busy) && styles.createSaveBtnDisabled,
                  ]}
                  disabled={!newName.trim() || busy}
                  onPress={() => void handleCreateFolder()}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.createSaveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          ) : null}

          <FlatList
            data={saveFolders}
            keyExtractor={(item) => item.id}
            style={styles.folderList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const checked = activeFolderIds.has(item.id);
              const coverPath = item.previewPaths[0];
              const coverUrl = coverPath
                ? buildThumbnailUrl(serverUrl, coverPath, sessionToken)
                : null;

              return (
                <TouchableOpacity
                  style={styles.folderRow}
                  onPress={() => void handleToggleFolder(item)}
                  activeOpacity={0.75}
                >
                  <View style={styles.folderLeft}>
                    <View style={styles.folderThumbBox}>
                      {coverUrl ? (
                        <Image
                          source={{ uri: coverUrl }}
                          style={styles.folderThumb}
                          contentFit="cover"
                        />
                      ) : (
                        <Bookmark size={20} color="#737373" />
                      )}
                    </View>
                    <View style={styles.folderMeta}>
                      <View style={styles.folderNameRow}>
                        <Text style={styles.folderName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.isDefault ? (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.folderCount}>
                        {item.itemCount} {item.itemCount === 1 ? "item" : "items"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.checkCircle,
                      checked && styles.checkCircleActive,
                    ]}
                  >
                    {checked ? <Check size={14} color="#000" strokeWidth={3} /> : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {activeFolderIds.size > 0 ? (
            <TouchableOpacity
              style={styles.unsaveBtn}
              onPress={() => void handleUnsaveAll()}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color="#ef4444" />
              <Text style={styles.unsaveBtnText}>Remove from Saved</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 60,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#171717",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  toastLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  toastThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#262626",
  },
  toastTextWrap: {
    flex: 1,
  },
  toastTitle: {
    color: "#fafafa",
    fontSize: 13,
    fontWeight: "700",
  },
  toastSub: {
    color: "#a3a3a3",
    fontSize: 11,
    marginTop: 1,
  },
  toastActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  toastActionText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxHeight: "75%",
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.24)",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  sheetTitle: {
    color: "#fafafa",
    fontSize: 17,
    fontWeight: "800",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  newFolderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#262626",
  },
  newFolderChipText: {
    color: "#fafafa",
    fontSize: 12,
    fontWeight: "700",
  },
  closeIconBtn: {
    padding: 4,
  },
  createBox: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: "#fafafa",
    fontSize: 14,
    paddingVertical: 4,
  },
  createSaveBtn: {
    backgroundColor: "#fafafa",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  createSaveBtnDisabled: {
    opacity: 0.4,
  },
  createSaveBtnText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  folderList: {
    marginTop: 6,
    maxHeight: 340,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  folderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  folderThumbBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#1f1f1f",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  folderThumb: {
    width: "100%",
    height: "100%",
  },
  folderMeta: {
    flex: 1,
  },
  folderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  folderName: {
    color: "#fafafa",
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  defaultBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: "#d4d4d4",
    fontSize: 10,
    fontWeight: "700",
  },
  folderCount: {
    color: "#a3a3a3",
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#525252",
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleActive: {
    backgroundColor: "#fafafa",
    borderColor: "#fafafa",
  },
  unsaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
  },
  unsaveBtnText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
});
