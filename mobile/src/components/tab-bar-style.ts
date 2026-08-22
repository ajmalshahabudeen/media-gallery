import { StyleSheet } from "react-native";

export const FLOATING_TAB_BAR_STYLE = {
  position: "absolute" as const,
  bottom: 20,
  left: 20,
  right: 20,
  height: 58,
  borderRadius: 29,
  backgroundColor: "transparent",
  borderTopWidth: 0,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(255, 255, 255, 0.14)",
  paddingTop: 0,
  paddingBottom: 0,
  paddingHorizontal: 8,
  margin: 0,
  elevation: 16,
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.4,
  shadowRadius: 18,
  display: "flex" as const,
};

export const HIDDEN_TAB_BAR_STYLE = {
  display: "none" as const,
  height: 0,
  opacity: 0,
  position: "absolute" as const,
};
