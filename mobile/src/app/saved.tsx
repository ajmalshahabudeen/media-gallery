import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bookmark,
  ChevronLeft,
  FolderPlus,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { buildThumbnailUrl } from "../lib/api";
import {
  useMobileStore,
  type MediaFile,
  type SaveFolderItem,
  type SavedMediaItem,
} from "../store/useMobileStore";
import { ReelsFeed } from "../components/preview/ReelsFeed";
import { SaveFolderSheet } from "../components/preview/SaveFolderSheet";
import type { ReelItemData } from "../components/preview/ReelItem";

const ALL_SAVED_ID = "__all_saved__";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FOLDER_GAP = 12;
const FOLDER_PAD = 16;
const FOLDER_CARD_WIDTH = (SCREEN_WIDTH - FOLDER_PAD * 2 - FOLDER_GAP) / 2;
const REEL_TILE_GAP = 2;
const REEL_TILE_SIZE = (SCREEN_WIDTH - REEL_TILE_GAP * 2) / 3;

function FolderCollage({
  paths,
  serverUrl,
  sessionToken,
}: {
  paths: string[];
  serverUrl: string;
  sessionToken: string | null;
}) {
  const cells = [0, 1, 2, 3];
  if (paths.length === 0) {
    return (
      <View style={styles.emptyCollage}>
        <Bookmark size={28} color="#525252" />
      </View>
    );
  }
  return (
    <View style={styles.collageGrid}>
      {cells.map((idx) => {
        const p = paths[idx];
        return (
          <View key={idx} style={styles.collageCell}>
            {p ? (
              <Image
                source={{ uri: buildThumbnailUrl(serverUrl, p, sessionToken) }}
                style={styles.collageImg}
                contentFit="cover"
              />
            ) : (
              <View style={styles.collagePlaceholder} />
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    serverUrl,
    sessionToken,
    saveFolders,
    savedMedia,
    fetchSaved,
    createSaveFolder,
    renameSaveFolder,
    deleteSaveFolder,
  } = useMobileStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<{
    videos: ReelItemData[];
    index: number;
    title: string;
  } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [actionFolder, setActionFolder] = useState<SaveFolderItem | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [manageFile, setManageFile] = useState<MediaFile | null>(null);

  useEffect(() => {
    void fetchSaved();
  }, [fetchSaved]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSaved();
    setRefreshing(false);
  }, [fetchSaved]);

  const allCard = useMemo<SaveFolderItem>(
    () => ({
      id: ALL_SAVED_ID,
      name: "All Saved",
      isDefault: false,
      itemCount: savedMedia.length,
      previewPaths: savedMedia.slice(0, 4).map((m) => m.path),
      createdAt: "",
      updatedAt: "",
    }),
    [savedMedia]
  );

  const folderCards = useMemo(
    () => [allCard, ...saveFolders],
    [allCard, saveFolders]
  );

  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    if (selectedFolderId === ALL_SAVED_ID) return allCard;
    return saveFolders.find((f) => f.id === selectedFolderId) || null;
  }, [selectedFolderId, allCard, saveFolders]);

  const activeItems = useMemo<SavedMediaItem[]>(() => {
    if (!selectedFolderId) return [];
    if (selectedFolderId === ALL_SAVED_ID) return savedMedia;
    return savedMedia.filter((item) => item.folderIds.includes(selectedFolderId));
  }, [selectedFolderId, savedMedia]);

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setFormError(null);
    const res = await createSaveFolder(trimmed);
    setBusy(false);
    if (!res.success) {
      setFormError(res.error || "Could not create folder");
      return;
    }
    setNewFolderName("");
    setCreateOpen(false);
  };

  const handleRenameFolder = async () => {
    if (!actionFolder || !renameText.trim() || busy) return;
    setBusy(true);
    setFormError(null);
    const res = await renameSaveFolder(actionFolder.id, renameText.trim());
    setBusy(false);
    if (!res.success) {
      setFormError(res.error || "Could not rename folder");
      return;
    }
    setRenameOpen(false);
    setActionFolder(null);
  };

  const handleDeleteFolder = (folder: SaveFolderItem) => {
    Alert.alert(
      "Delete Save Folder",
      `Delete "${folder.name}"? Reels only saved in this folder will be unsaved. No disk files are deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionFolder(null);
            await deleteSaveFolder(folder.id);
            if (selectedFolderId === folder.id) {
              setSelectedFolderId(null);
            }
          },
        },
      ]
    );
  };

  const openReelInFolderPlayer = (index: number) => {
    const reels: ReelItemData[] = activeItems.map((item) => ({
      ...item,
      type: "video",
      isSaved: true,
      savedFolderIds: item.folderIds,
    }));
    setPlayerState({
      videos: reels,
      index,
      title: activeFolder?.name || "Saved",
    });
  };

  if (playerState) {
    return (
      <View style={styles.root}>
        <ReelsFeed
          initialVideos={playerState.videos}
          initialIndex={playerState.index}
          scopedTitle={playerState.title}
          onCloseScoped={() => setPlayerState(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 12) + 4 },
        ]}
      >
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            if (selectedFolderId) {
              setSelectedFolderId(null);
            } else {
              router.back();
            }
          }}
          hitSlop={10}
        >
          <ChevronLeft size={24} color="#fafafa" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeFolder ? activeFolder.name : "Saved"}
          </Text>
          <Text style={styles.headerSub}>
            {activeFolder
              ? `${activeItems.length} ${activeItems.length === 1 ? "reel" : "reels"}`
              : `${saveFolders.length} folders • ${savedMedia.length} saved`}
          </Text>
        </View>

        {!activeFolder ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setFormError(null);
              setNewFolderName("");
              setCreateOpen(true);
            }}
            hitSlop={10}
          >
            <Plus size={22} color="#fafafa" />
          </TouchableOpacity>
        ) : activeFolder.id !== ALL_SAVED_ID && !activeFolder.isDefault ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setActionFolder(activeFolder)}
            hitSlop={10}
          >
            <MoreVertical size={20} color="#fafafa" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>

      {/* Folder Grid vs Inside Folder 3-Column Grid */}
      {!activeFolder ? (
        <FlatList
          key="folders-grid"
          data={folderCards}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.folderGridRow}
          contentContainerStyle={[
            styles.folderGridContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 20 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#fafafa"
              colors={["#fafafa"]}
              progressBackgroundColor="#171717"
            />
          }
          renderItem={({ item }) => {
            const isCustom = item.id !== ALL_SAVED_ID && !item.isDefault;
            return (
              <TouchableOpacity
                style={styles.folderCard}
                onPress={() => setSelectedFolderId(item.id)}
                onLongPress={() => {
                  if (isCustom) setActionFolder(item);
                }}
                activeOpacity={0.82}
              >
                <View style={styles.collageBox}>
                  <FolderCollage
                    paths={item.previewPaths}
                    serverUrl={serverUrl}
                    sessionToken={sessionToken}
                  />
                  {item.isDefault ? (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>Default</Text>
                    </View>
                  ) : null}
                  {isCustom ? (
                    <TouchableOpacity
                      style={styles.cardMoreBtn}
                      onPress={() => setActionFolder(item)}
                      hitSlop={8}
                    >
                      <MoreVertical size={15} color="#fff" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardCount}>
                  {item.itemCount} {item.itemCount === 1 ? "item" : "items"}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : activeItems.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Bookmark size={36} color="#525252" />
          </View>
          <Text style={styles.emptyTitle}>Nothing saved in {activeFolder.name}</Text>
          <Text style={styles.emptyBody}>
            Tap the bookmark icon on any reel to save it here.
          </Text>
        </View>
      ) : (
        <FlatList
          key="reels-grid"
          data={activeItems}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.reelGridRow}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#fafafa"
              colors={["#fafafa"]}
              progressBackgroundColor="#171717"
            />
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.reelTile}
              onPress={() => openReelInFolderPlayer(index)}
              onLongPress={() => setManageFile(item)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: buildThumbnailUrl(serverUrl, item.path, sessionToken) }}
                style={styles.reelTileImg}
                contentFit="cover"
              />
              <View style={styles.reelPlayBadge}>
                <Play size={13} color="#fff" fill="#fff" />
              </View>
              <View style={styles.reelNameBar}>
                <Text style={styles.reelNameText} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Save Folder Modal */}
      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <FolderPlus size={18} color="#fafafa" />
                <Text style={styles.modalTitle}>New Save Folder</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <X size={20} color="#a3a3a3" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Virtual folder stored in database only (no disk folder created).
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Folder name"
              placeholderTextColor="#737373"
              value={newFolderName}
              onChangeText={setNewFolderName}
              maxLength={60}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void handleCreateFolder()}
            />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (!newFolderName.trim() || busy) && styles.disabledBtn,
                ]}
                disabled={!newFolderName.trim() || busy}
                onPress={() => void handleCreateFolder()}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.confirmBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Folder Actions Sheet (Rename / Delete) */}
      <Modal
        visible={!!actionFolder && !renameOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setActionFolder(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActionFolder(null)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{actionFolder?.name}</Text>
            <TouchableOpacity
              style={styles.sheetActionRow}
              onPress={() => {
                if (!actionFolder) return;
                setFormError(null);
                setRenameText(actionFolder.name);
                setRenameOpen(true);
              }}
            >
              <Pencil size={18} color="#fafafa" />
              <Text style={styles.sheetActionText}>Rename folder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetActionRow}
              onPress={() => actionFolder && handleDeleteFolder(actionFolder)}
            >
              <Trash2 size={18} color="#ef4444" />
              <Text style={[styles.sheetActionText, { color: "#ef4444" }]}>
                Delete folder
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={renameOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setRenameOpen(false);
          setActionFolder(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename Save Folder</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              maxLength={60}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void handleRenameFolder()}
            />
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setRenameOpen(false);
                  setActionFolder(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (!renameText.trim() || busy) && styles.disabledBtn,
                ]}
                disabled={!renameText.trim() || busy}
                onPress={() => void handleRenameFolder()}
              >
                <Text style={styles.confirmBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage individual reel folders via long press in 3-col grid */}
      <SaveFolderSheet
        visible={!!manageFile}
        file={manageFile}
        onClose={() => setManageFile(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#000",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholder: {
    width: 38,
    height: 38,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: "#fafafa",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    color: "#a3a3a3",
    fontSize: 11,
    marginTop: 2,
  },
  folderGridContent: {
    padding: FOLDER_PAD,
    gap: FOLDER_GAP,
  },
  folderGridRow: {
    gap: FOLDER_GAP,
  },
  folderCard: {
    width: FOLDER_CARD_WIDTH,
    marginBottom: 8,
  },
  collageBox: {
    width: FOLDER_CARD_WIDTH,
    height: FOLDER_CARD_WIDTH,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  collageGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  collageCell: {
    width: "50%",
    height: "50%",
    padding: 0.5,
  },
  collageImg: {
    width: "100%",
    height: "100%",
  },
  collagePlaceholder: {
    flex: 1,
    backgroundColor: "#1c1c1c",
  },
  emptyCollage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141414",
  },
  defaultPill: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  defaultPillText: {
    color: "#fafafa",
    fontSize: 10,
    fontWeight: "700",
  },
  cardMoreBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#fafafa",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  cardCount: {
    color: "#a3a3a3",
    fontSize: 12,
    marginTop: 2,
  },
  reelGridRow: {
    gap: REEL_TILE_GAP,
    marginBottom: REEL_TILE_GAP,
  },
  reelTile: {
    width: REEL_TILE_SIZE,
    height: REEL_TILE_SIZE * 1.35,
    backgroundColor: "#141414",
    overflow: "hidden",
  },
  reelTileImg: {
    width: "100%",
    height: "100%",
  },
  reelPlayBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  reelNameBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  reelNameText: {
    color: "#fafafa",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: "#fafafa",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyBody: {
    color: "#a3a3a3",
    fontSize: 13,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#141414",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    color: "#fafafa",
    fontSize: 17,
    fontWeight: "800",
  },
  modalHint: {
    color: "#a3a3a3",
    fontSize: 12,
  },
  modalInput: {
    backgroundColor: "#1f1f1f",
    color: "#fafafa",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#262626",
  },
  cancelBtnText: {
    color: "#fafafa",
    fontWeight: "600",
    fontSize: 13,
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fafafa",
  },
  disabledBtn: {
    opacity: 0.45,
  },
  confirmBtnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 13,
  },
  sheetActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  sheetActionText: {
    color: "#fafafa",
    fontSize: 15,
    fontWeight: "600",
  },
});
