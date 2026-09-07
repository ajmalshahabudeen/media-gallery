import { useRef } from "react";
import { Dimensions, PanResponder, type PanResponderInstance } from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;
/** Minimum downward distance in px to trigger dismiss on release */
const DISMISS_THRESHOLD = 40;
/** Velocity that can override distance threshold (px/ms) */
const VELOCITY_THRESHOLD = 0.2;

interface UseDragToCloseOptions {
  /** Called when the dismiss animation finishes */
  onClose: () => void;
  /** Set to false to disable the gesture (e.g. during fullscreen) */
  enabled?: boolean;
}

/**
 * Returns animated styles + a PanResponder for drag-to-dismiss with genuine physics inertia.
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
   */
  const dismissedRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireClose = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    onClose();
  };

  // ---------- animated styles ----------

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const upNextOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, 100],
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
       * Claim the gesture as soon as user drags down slightly (> 6px)
       * and the movement is predominantly vertical downward.
       */
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => {
        if (!enabled || isDismissing.value) return false;
        return g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2;
      },
      onPanResponderGrant: () => {
        // active gesture started
      },
      onPanResponderMove: (_e, g) => {
        if (isDismissing.value) return;
        if (g.dy < 0) {
          // Subtle rubber-band resistance when dragging upward
          translateY.value = g.dy * 0.15;
        } else {
          // Direct 1:1 finger tracking
          translateY.value = g.dy;
        }
      },
      onPanResponderRelease: (_e, g) => {
        if (isDismissing.value) return;

        const velocity = g.vy * 1000; // convert px/ms to px/sec
        const isFlickingUp = g.vy < -0.15;
        const shouldDismiss =
          !isFlickingUp && (g.dy > DISMISS_THRESHOLD || g.vy > VELOCITY_THRESHOLD);

        if (shouldDismiss) {
          isDismissing.value = true;

          // Physics inertia:
          // Honor the user's release velocity, with a minimum exit momentum of 1500 px/s
          // so even a slow release rapidly accelerates and glides off-screen smoothly in ~130ms.
          const exitVelocity = Math.max(velocity, 1500);

          translateY.value = withSpring(
            SCREEN_HEIGHT + 80,
            {
              velocity: exitVelocity,
              damping: 24,
              stiffness: 280,
              mass: 0.5,
              overshootClamping: true,
            },
            (finished) => {
              if (finished) {
                runOnJS(fireClose)();
              }
            }
          );

          // Safety timeout ensures onClose always runs even if animation is interrupted
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => {
            fireClose();
          }, 220);
        } else {
          // Snap back with natural physics spring
          translateY.value = withSpring(0, {
            velocity: velocity,
            damping: 22,
            stiffness: 320,
            mass: 0.6,
          });
        }
      },
      onPanResponderTerminate: (_e, g) => {
        if (!isDismissing.value) {
          translateY.value = withSpring(0, {
            velocity: (g?.vy ?? 0) * 1000,
            damping: 22,
            stiffness: 320,
            mass: 0.6,
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
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      translateY.value = 0;
      isDismissing.value = false;
    },
  };
}
