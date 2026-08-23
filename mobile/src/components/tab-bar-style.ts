import { StyleSheet } from "react-native";

const BASE_TAB_BAR = {
  backgroundColor: "#000000",
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: "rgba(255, 255, 255, 0.12)",
  borderWidth: 0,
  borderColor: "transparent",
  borderRadius: 0,
  paddingTop: 6,
  paddingHorizontal: 0,
  margin: 0,
  elevation: 0,
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  display: "flex" as const,
};

/** Instagram-style flush bottom bar. Keep the export name — Reels/chrome import it. */
export function instagramTabBarStyle(visible: boolean, bottomInset = 0) {
  if (!visible) {
    return {
      ...BASE_TAB_BAR,
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      borderTopWidth: 0,
      transform: [{ translateY: 64 }],
      opacity: 0,
    };
  }
  return {
    ...BASE_TAB_BAR,
    height: 52 + bottomInset,
    paddingBottom: Math.max(bottomInset, 4),
    transform: [{ translateY: 0 }],
    opacity: 1,
  };
}

export const FLOATING_TAB_BAR_STYLE = instagramTabBarStyle(true, 0);
export const HIDDEN_TAB_BAR_STYLE = instagramTabBarStyle(false, 0);
