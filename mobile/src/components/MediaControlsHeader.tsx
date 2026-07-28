import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
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
} from "lucide-react-native";
import { useMobileStore } from "../store/useMobileStore";

interface Props {
  title: string;
  itemCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const MediaControlsHeader: React.FC<Props> = ({
  title,
  itemCount,
  onRefresh,
  isRefreshing = false,
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
  } = useMobileStore();

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
      {/* Top Bar Header */}
      <View style={styles.topHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>{itemCount} items</Text>
        </View>

        <View style={styles.topActions}>
          {onRefresh && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} color={isRefreshing ? "#818cf8" : "#94a3b8"} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowOptionsModal(true)}
          >
            <SlidersHorizontal
              size={18}
              color={groupBy !== "none" ? "#818cf8" : "#94a3b8"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? (
              <List size={18} color="#94a3b8" />
            ) : (
              <LayoutGrid size={18} color="#94a3b8" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Search size={16} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search photos, videos, audio..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
            <X size={16} color="#94a3b8" />
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
          <ImageIcon size={12} color={selectedType === "image" ? "#ffffff" : "#94a3b8"} />
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
          <Film size={12} color={selectedType === "video" ? "#ffffff" : "#94a3b8"} />
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
          <Music size={12} color={selectedType === "audio" ? "#ffffff" : "#94a3b8"} />
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

      {/* Quick Group & Sort Info Ribbon */}
      <View style={styles.infoRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ribbonScroll}>
          <TouchableOpacity
            style={[styles.ribbonTag, groupBy !== "none" && styles.ribbonTagActive]}
            onPress={() => setShowOptionsModal(true)}
          >
            <Layers size={12} color={groupBy !== "none" ? "#a5b4fc" : "#64748b"} />
            <Text style={[styles.ribbonTagText, groupBy !== "none" && styles.ribbonTagTextActive]}>
              Group: {groupBy === "none" ? "None" : groupBy}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ribbonTag}
            onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            <ArrowUpDown size={12} color="#64748b" />
            <Text style={styles.ribbonTagText}>
              Sort: {sortBy} ({sortOrder.toUpperCase()})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Filter & Group Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsModal(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Group Options</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

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
                      color={isSelected ? "#818cf8" : "#94a3b8"}
                    />
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={16} color="#818cf8" style={{ marginLeft: "auto" }} />}
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
              <ArrowUpDown size={16} color="#818cf8" />
              <Text style={styles.orderToggleText}>
                Order: {sortOrder === "asc" ? "Ascending (A-Z, Oldest)" : "Descending (Z-A, Newest)"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.applyBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 8,
  },
  titleContainer: {},
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f8fafc",
  },
  headerSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#f8fafc",
    fontSize: 13,
    paddingVertical: 10,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginVertical: 4,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterChipActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  filterChipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#ffffff",
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
    borderColor: "#334155",
  },
  ribbonTagActive: {
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    borderColor: "#6366f1",
  },
  ribbonTagText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  ribbonTagTextActive: {
    color: "#a5b4fc",
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
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
    color: "#f8fafc",
  },
  modalCloseBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
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
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  optionCardSelected: {
    borderColor: "#6366f1",
    backgroundColor: "rgba(79, 70, 229, 0.15)",
  },
  optionText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#f8fafc",
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
    backgroundColor: "#0f172a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sortChipSelected: {
    backgroundColor: "#4f46e5",
    borderColor: "#6366f1",
  },
  sortChipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  sortChipTextSelected: {
    color: "#ffffff",
  },
  orderToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0f172a",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
  },
  orderToggleText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
  },
  applyBtn: {
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
