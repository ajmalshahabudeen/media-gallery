import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Film,
  Music,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Folder,
  Calendar,
  Layers,
  Check,
  Upload,
} from "lucide-react-native";
import { useMobileStore } from "../store/useMobileStore";
import { collectFolderOptions, folderLabel } from "../lib/folder-filter";

interface Props {
  title: string;
  itemCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onUpload?: () => void;
}

export const MediaControlsHeader: React.FC<Props> = ({
  title,
  itemCount,
  onRefresh,
  isRefreshing = false,
  onUpload,
}) => {
  const {
    selectedType,
    setSelectedType,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    groupBy,
    setGroupBy,
    galleryLayout,
    files,
    folders,
    folderFilterEnabled,
    selectedFolders,
    setFolderFilterEnabled,
    toggleSelectedFolder,
  } = useMobileStore();
  const insets = useSafeAreaInsets();
  const hideViewToggle = galleryLayout === "feed";
  const folderOptions = useMemo(
    () => collectFolderOptions(files, folders),
    [files, folders]
  );
  const folderFilterActive = folderFilterEnabled && selectedFolders.length > 0;

  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const groupOptions: { id: "none" | "folder" | "type" | "date"; label: string; icon: any }[] = [
    { id: "none", label: "No Grouping", icon: Layers },
    { id: "folder", label: "By Folder", icon: Folder },
    { id: "type", label: "By Media Type", icon: ImageIcon },
    { id: "date", label: "By Date", icon: Calendar },
  ];

  const sortOptions: { id: "name" | "date" | "size"; label: string }[] = [
    { id: "name", label: "Name" },
    { id: "date", label: "Date Modified" },
    { id: "size", label: "File Size" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerCount}>{itemCount}</Text>
        </View>

        <View style={styles.topActions}>
          {onUpload && (
            <TouchableOpacity style={styles.iconBtn} onPress={onUpload} hitSlop={10}>
              <Upload size={18} color="#fafafa" />
            </TouchableOpacity>
          )}

          {onRefresh && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onRefresh}
              disabled={isRefreshing}
              hitSlop={10}
            >
              <RefreshCw size={18} color={isRefreshing ? "#737373" : "#fafafa"} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowOptionsModal(true)}
            hitSlop={10}
          >
            <SlidersHorizontal
              size={18}
              color={groupBy !== "none" || folderFilterActive ? "#fafafa" : "#a3a3a3"}
            />
          </TouchableOpacity>

          {hideViewToggle ? null : (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              hitSlop={10}
            >
              {viewMode === "grid" ? (
                <List size={18} color="#fafafa" />
              ) : (
                <LayoutGrid size={18} color="#fafafa" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color="#737373" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search photos, videos, audio..."
          placeholderTextColor="#737373"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
            <X size={16} color="#a3a3a3" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Type Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, selectedType === "all" && styles.filterChipActive]}
          onPress={() => setSelectedType("all")}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedType === "all" && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedType === "image" && styles.filterChipActive]}
          onPress={() => setSelectedType("image")}
        >
          <ImageIcon size={12} color={selectedType === "image" ? "#000000" : "#a3a3a3"} />
          <Text
            style={[
              styles.filterChipText,
              selectedType === "image" && styles.filterChipTextActive,
            ]}
          >
            Photos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedType === "video" && styles.filterChipActive]}
          onPress={() => setSelectedType("video")}
        >
          <Film size={12} color={selectedType === "video" ? "#000000" : "#a3a3a3"} />
          <Text
            style={[
              styles.filterChipText,
              selectedType === "video" && styles.filterChipTextActive,
            ]}
          >
            Videos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedType === "audio" && styles.filterChipActive]}
          onPress={() => setSelectedType("audio")}
        >
          <Music size={12} color={selectedType === "audio" ? "#000000" : "#a3a3a3"} />
          <Text
            style={[
              styles.filterChipText,
              selectedType === "audio" && styles.filterChipTextActive,
            ]}
          >
            Audio
          </Text>
        </TouchableOpacity>
      </View>

      {hideViewToggle ? null : (
      <View style={styles.infoRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ribbonScroll}>
          <TouchableOpacity
            style={[styles.ribbonTag, groupBy !== "none" && styles.ribbonTagActive]}
            onPress={() => setShowOptionsModal(true)}
          >
            <Layers size={12} color={groupBy !== "none" ? "#fafafa" : "#737373"} />
            <Text style={[styles.ribbonTagText, groupBy !== "none" && styles.ribbonTagTextActive]}>
              Group: {groupBy === "none" ? "None" : groupBy}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ribbonTag, folderFilterActive && styles.ribbonTagActive]}
            onPress={() => setShowOptionsModal(true)}
          >
            <Folder size={12} color={folderFilterActive ? "#fafafa" : "#737373"} />
            <Text style={[styles.ribbonTagText, folderFilterActive && styles.ribbonTagTextActive]}>
              {folderFilterActive
                ? `Folders: ${selectedFolders.length}`
                : "Folders: All"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ribbonTag}
            onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            <ArrowUpDown size={12} color="#737373" />
            <Text style={styles.ribbonTagText}>
              Sort: {sortBy} ({sortOrder.toUpperCase()})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      )}

      <Modal
        visible={showOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowOptionsModal(false)} />
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Group Options</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#a3a3a3" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              bounces
            >

            {/* Group By Section */}
            <Text style={styles.sectionLabel}>Group Items By</Text>
            <View style={styles.optionsGrid}>
              {groupOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = groupBy === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setGroupBy(opt.id)}
                  >
                    <IconComponent
                      size={18}
                      color={isSelected ? "#fafafa" : "#a3a3a3"}
                    />
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={16} color="#fafafa" style={{ marginLeft: "auto" }} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sort By Section */}
            <Text style={styles.sectionLabel}>Sort Items By</Text>
            <View style={styles.optionsRow}>
              {sortOptions.map((opt) => {
                const isSelected = sortBy === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.sortChip, isSelected && styles.sortChipSelected]}
                    onPress={() => setSortBy(opt.id)}
                  >
                    <Text style={[styles.sortChipText, isSelected && styles.sortChipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sort Order Toggle */}
            <TouchableOpacity
              style={styles.orderToggleBtn}
              onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <ArrowUpDown size={16} color="#fafafa" />
              <Text style={styles.orderToggleText}>
                Order: {sortOrder === "asc" ? "Ascending (A-Z, Oldest)" : "Descending (Z-A, Newest)"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Show Only From Selected Folders</Text>
            <TouchableOpacity
              style={[styles.optionCard, folderFilterEnabled && styles.optionCardSelected]}
              onPress={() => setFolderFilterEnabled(!folderFilterEnabled)}
            >
              <Folder size={18} color={folderFilterEnabled ? "#fafafa" : "#a3a3a3"} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, folderFilterEnabled && styles.optionTextSelected]}>
                  Filter by folders
                </Text>
                <Text style={styles.optionHint}>
                  {folderFilterEnabled
                    ? selectedFolders.length > 0
                      ? `${selectedFolders.length} folder${selectedFolders.length === 1 ? "" : "s"} selected`
                      : "On — pick one or more folders below"
                    : "Off — showing every folder"}
                </Text>
              </View>
              {folderFilterEnabled ? <Check size={16} color="#fafafa" /> : null}
            </TouchableOpacity>

            {folderFilterEnabled ? (
              <View style={styles.folderList}>
                {folderOptions.length === 0 ? (
                  <Text style={styles.optionHint}>Scan your library to see folders.</Text>
                ) : (
                  folderOptions.map((folder) => {
                    const selected = selectedFolders.includes(folder);
                    return (
                      <TouchableOpacity
                        key={folder}
                        style={[styles.folderRow, selected && styles.folderRowSelected]}
                        onPress={() => toggleSelectedFolder(folder)}
                      >
                        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                          {selected ? <Check size={12} color="#000000" /> : null}
                        </View>
                        <Text
                          style={[styles.folderRowText, selected && styles.folderRowTextSelected]}
                          numberOfLines={2}
                        >
                          {folderLabel(folder)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null}

            </ScrollView>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.applyBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 2,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fafafa",
    letterSpacing: -0.3,
  },
  headerCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#737373",
  },
  headerSub: {
    fontSize: 12,
    color: "#737373",
    marginTop: 2,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171717",
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fafafa",
    fontSize: 13,
    paddingVertical: 10,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 14,
    marginTop: 2,
    marginBottom: 6,
    gap: 6,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  filterChipActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  filterChipText: {
    color: "#a3a3a3",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#000000",
  },
  infoRibbon: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  ribbonScroll: {
    flexDirection: "row",
    gap: 8,
  },
  ribbonTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
  },
  ribbonTagActive: {
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    borderColor: "#ffffff",
  },
  ribbonTagText: {
    color: "#737373",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  ribbonTagTextActive: {
    color: "#fafafa",
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#171717",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#262626",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fafafa",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    maxHeight: Math.round(Dimensions.get("window").height * 0.52),
  },
  modalBodyContent: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#a3a3a3",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsGrid: {
    gap: 8,
    marginBottom: 8,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#000000",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
  },
  optionCardSelected: {
    borderColor: "#ffffff",
    backgroundColor: "rgba(79, 70, 229, 0.15)",
  },
  optionText: {
    color: "#a3a3a3",
    fontSize: 14,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#fafafa",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  sortChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#000000",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
  },
  sortChipSelected: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  sortChipText: {
    color: "#a3a3a3",
    fontSize: 12,
    fontWeight: "600",
  },
  sortChipTextSelected: {
    color: "#000000",
  },
  orderToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#000000",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 16,
  },
  orderToggleText: {
    color: "#d4d4d4",
    fontSize: 13,
    fontWeight: "600",
  },
  optionHint: {
    color: "#737373",
    fontSize: 11,
    marginTop: 2,
  },
  folderList: {
    marginTop: 8,
    marginBottom: 12,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 6,
  },
  folderRowSelected: {
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  folderRowText: {
    flex: 1,
    color: "#a3a3a3",
    fontSize: 13,
    fontWeight: "600",
  },
  folderRowTextSelected: {
    color: "#fafafa",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#525252",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxSelected: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  applyBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  applyBtnText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
