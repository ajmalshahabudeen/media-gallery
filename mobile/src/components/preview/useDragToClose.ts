import { useRef } from "react";
import { Dimensions, PanResponder, type PanResponderInstance } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;
/** How far down the user must drag before release triggers dismiss */
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.10;
/** Velocity that can override the distance threshold (px/ms) */
const VELOCITY_THRESHOLD = 0.3;

interface UseDragToCloseOptions {
  /** Called when the dismiss animation finishes */
  onClose: () => void;
  /** Set to false to disable the gesture (e.g. during fullscreen) */
  enabled?: boolean;
}

/**
 * Returns animated styles + a PanResponder for drag-to-dismiss.
 *
 * • `containerStyle` – apply to the whole screen wrapper (translateY)
 * • `upNextStyle`    – apply to the "Up Next" / below-video list (opacity fade)
 * • `backdropStyle`  – apply to a backdrop View behind everything (fades in dark → transparent)
 * • `panHandlers`    – spread onto the drag zone (video + info, NOT the controls)
 */
export function useDragToClose({ onClose, enabled = true }: UseDragToCloseOptions) {
  const translateY = useSharedValue(0);
  const isDismissing = useSharedValue(false);

  /**
   * We track a "dismissed" flag in a ref so we don't fire onClose twice
   * (the spring can bounce near zero, and RN timers can be jittery).
   */
  const dismissedRef = useRef(false);

  const fireClose = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onClose();
  };

  // ---------- animated styles ----------

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const upNextOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, DISMISS_THRESHOLD],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const backdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT * 0.5],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // ---------- pan responder ----------

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      /**
       * Only claim the gesture when the user is dragging predominantly
       * downward and has moved more than 10px in that direction.
       * This avoids stealing horizontal scrub / tap gestures from the
       * video player overlay.
       */
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => {
        if (!enabled) return false;
        // Only respond to clear vertical-down drags
        return g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
      },
      onPanResponderGrant: () => {
        // nothing – translateY is already at the right value
      },
      onPanResponderMove: (_e, g) => {
        if (isDismissing.value) return;
        // Only allow downward movement (clamp at 0 to prevent upward dragging)
        translateY.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (isDismissing.value) return;

        const shouldDismiss =
          g.dy > DISMISS_THRESHOLD || g.vy > VELOCITY_THRESHOLD;

        if (shouldDismiss) {
          isDismissing.value = true;
          // Close immediately so the modal unmounts and stops eating touches.
          // No need to wait for the slide-out animation — the modal will
          // disappear as soon as onClose sets file to null.
          fireClose();
        } else {
          // Snap back
          translateY.value = withSpring(0, {
            damping: 20,
            stiffness: 300,
            mass: 0.8,
          });
        }
      },
      onPanResponderTerminate: () => {
        if (!isDismissing.value) {
          translateY.value = withSpring(0, {
            damping: 20,
            stiffness: 300,
            mass: 0.8,
          });
        }
      },
    })
  ).current;

  return {
    containerStyle,
    upNextOpacity,
    backdropStyle,
    panHandlers: panResponder.panHandlers,
    /** Reset state if the modal is reused */
    reset: () => {
      dismissedRef.current = false;
      translateY.value = 0;
      isDismissing.value = false;
    },
  };
}
