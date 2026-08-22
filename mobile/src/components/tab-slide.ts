import { Animated, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

/** Full-width page slide when switching bottom tabs. */
export function slideTabInterpolator({
  current,
}: {
  current: { progress: Animated.Value };
}) {
  return {
    sceneStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          }),
        },
      ],
    },
  };
}

export const TAB_TRANSITION_SPEC = {
  animation: "timing" as const,
  config: { duration: 260 },
};
