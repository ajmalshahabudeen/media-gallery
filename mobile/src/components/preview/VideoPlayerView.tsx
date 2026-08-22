import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { YoutubePlayerOverlay, nextPlaybackRate } from "./youtube-player-overlay";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DOUBLE_TAP_MS = 300;
const ZONE_LEFT = 0.35;
const ZONE_RIGHT = 0.65;
const SCRUB_DX_THRESHOLD = 14;
const SCRUB_AXIS_RATIO = 1.15;

interface Props {
  uri: string;
  posterUri?: string;
  onOpenExternal?: () => void;
  title?: string;
  onPrevVideo?: () => void;
  onNextVideo?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const VideoPlayerView: React.FC<Props> = ({
  uri,
  title,
  onPrevVideo,
  onNextVideo,
  hasPrev,
  hasNext,
}) => {
  const router = useRouter();

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showSkipHint, setShowSkipHint] = useState<"back" | "fwd" | null>(null);
  const [scrubOverlay, setScrubOverlay] = useState<{
    delta: number;
    target: number;
  } | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const isSeekingRef = useRef(false);
  const containerWidthRef = useRef(SCREEN_WIDTH);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const scrubActiveRef = useRef(false);
  const scrubStartPosRef = useRef(0);
  const scrubTargetRef = useRef(0);
  const grantXRef = useRef(0);

  const expoPlayer = useVideoPlayer(uri, (player: any) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    if (expoPlayer && uri) {
      const swap = async () => {
        try {
          if (typeof expoPlayer.replaceAsync === "function") {
            await expoPlayer.replaceAsync(uri);
          } else {
            expoPlayer.replace(uri);
          }
          expoPlayer.play();
        } catch {
          // ignore
        }
      };
      void swap();
    }
  }, [expoPlayer, uri]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);
  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  useEffect(() => {
    if (!expoPlayer) return;
    durationPollRef.current = setInterval(() => {
      try {
        const d = expoPlayer.duration;
        if (d && d > 0 && isFinite(d)) {
          setDuration(d);
          if (durationPollRef.current) {
            clearInterval(durationPollRef.current);
            durationPollRef.current = null;
          }
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => {
      if (durationPollRef.current) {
        clearInterval(durationPollRef.current);
        durationPollRef.current = null;
      }
    };
  }, [expoPlayer]);

  useEffect(() => {
    if (!expoPlayer) return;
    const timeSub = expoPlayer.addListener("timeUpdate", (event: any) => {
      if (!isSeekingRef.current) {
        setPosition(event.currentTime || 0);
      }
      const d = event.duration || expoPlayer.duration;
      if (d && d > 0 && isFinite(d)) setDuration(d);
      setIsLoading(false);
    });
    const statusSub = expoPlayer.addListener("statusChange", (status: any) => {
      const statusStr = typeof status === "string" ? status : status?.status;
      if (statusStr === "readyToPlay") {
        setIsLoading(false);
        try {
          const d = expoPlayer.duration;
          if (d && d > 0 && isFinite(d)) setDuration(d);
        } catch {
          // ignore
        }
      }
    });
    const playingSub = expoPlayer.addListener("playingChange", (event: any) => {
      setIsPlaying(event.isPlaying);
    });
    return () => {
      timeSub?.remove();
      statusSub?.remove();
      playingSub?.remove();
    };
  }, [expoPlayer]);

  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying && showControls) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 2800);
    }
  }, [isPlaying, showControls]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    return () => {
      if (skipHintTimer.current) clearTimeout(skipHintTimer.current);
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  const flashSkipHint = useCallback((dir: "back" | "fwd") => {
    setShowSkipHint(dir);
    if (skipHintTimer.current) clearTimeout(skipHintTimer.current);
    skipHintTimer.current = setTimeout(() => setShowSkipHint(null), 520);
  }, []);

  const seekAbsolute = useCallback(
    (value: number) => {
      const d = durationRef.current;
      const next = d > 0 ? Math.max(0, Math.min(d, value)) : Math.max(0, value);
      if (expoPlayer) {
        try {
          expoPlayer.currentTime = next;
        } catch {
          // ignore
        }
      }
      setPosition(next);
      positionRef.current = next;
    },
    [expoPlayer]
  );

  const handlePlayPause = useCallback(() => {
    if (!expoPlayer) return;
    if (expoPlayer.playing) expoPlayer.pause();
    else expoPlayer.play();
    resetHideTimer();
  }, [expoPlayer, resetHideTimer]);

  const handleSkip = useCallback(
    (seconds: number) => {
      if (expoPlayer) {
        try {
          if (typeof expoPlayer.seekBy === "function") {
            expoPlayer.seekBy(seconds);
          } else {
            const d = expoPlayer.duration || durationRef.current || 0;
            const cur = expoPlayer.currentTime || positionRef.current || 0;
            expoPlayer.currentTime =
              d > 0 ? Math.max(0, Math.min(d, cur + seconds)) : Math.max(0, cur + seconds);
          }
          const cur = expoPlayer.currentTime;
          if (typeof cur === "number") {
            setPosition(cur);
            positionRef.current = cur;
          }
        } catch {
          // ignore
        }
      }
      flashSkipHint(seconds < 0 ? "back" : "fwd");
      resetHideTimer();
    },
    [expoPlayer, flashSkipHint, resetHideTimer]
  );

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (expoPlayer) expoPlayer.muted = next;
  };

  const handleCycleSpeed = () => {
    const next = nextPlaybackRate(playbackRate);
    setPlaybackRate(next);
    if (expoPlayer) {
      try {
        expoPlayer.playbackRate = next;
      } catch {
        // ignore
      }
    }
    resetHideTimer();
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
    isSeekingRef.current = true;
  };

  const handleSeekRatio = (ratio: number) => {
    const next = ratio * (durationRef.current || 0);
    setPosition(next);
    positionRef.current = next;
  };

  const handleSeekComplete = (ratio: number) => {
    seekAbsolute(ratio * (durationRef.current || 0));
    setIsSeeking(false);
    isSeekingRef.current = false;
    resetHideTimer();
  };

  const handleFullscreen = () => {
    if (expoPlayer) expoPlayer.pause();
    router.push({
      pathname: "/fullscreen-video",
      params: { uri, title: title || "Video" },
    } as any);
  };

  const handleSurfaceTap = useCallback(
    (x: number) => {
      const width = containerWidthRef.current || 1;
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.time < DOUBLE_TAP_MS) {
        if (singleTapTimer.current) {
          clearTimeout(singleTapTimer.current);
          singleTapTimer.current = null;
        }
        lastTapRef.current = null;
        const zone = x < width * ZONE_LEFT ? "left" : x > width * ZONE_RIGHT ? "right" : "center";
        if (zone === "left") {
          handleSkip(-10);
          return;
        }
        if (zone === "right") {
          handleSkip(10);
          return;
        }
        handlePlayPause();
        return;
      }
      lastTapRef.current = { time: now, x };
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => {
        if (lastTapRef.current && lastTapRef.current.time === now) {
          lastTapRef.current = null;
          setShowControls((prev) => !prev);
        }
        singleTapTimer.current = null;
      }, DOUBLE_TAP_MS);
    },
    [handlePlayPause, handleSkip]
  );

  const seekAbsoluteRef = useRef(seekAbsolute);
  const handleSurfaceTapRef = useRef(handleSurfaceTap);
  const resetHideTimerRef = useRef(resetHideTimer);
  useEffect(() => {
    seekAbsoluteRef.current = seekAbsolute;
    handleSurfaceTapRef.current = handleSurfaceTap;
    resetHideTimerRef.current = resetHideTimer;
  }, [seekAbsolute, handleSurfaceTap, resetHideTimer]);

  const playerHeight = SCREEN_WIDTH * (9 / 16);

  const stablePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) => {
        return Math.abs(g.dx) > SCRUB_DX_THRESHOLD && Math.abs(g.dx) > Math.abs(g.dy) * SCRUB_AXIS_RATIO;
      },
      onPanResponderTerminationRequest: () => !scrubActiveRef.current,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        scrubActiveRef.current = false;
        scrubStartPosRef.current = positionRef.current;
        scrubTargetRef.current = positionRef.current;
        grantXRef.current = e.nativeEvent.locationX ?? 0;
      },
      onPanResponderMove: (_e, g: PanResponderGestureState) => {
        const horizontal =
          Math.abs(g.dx) > SCRUB_DX_THRESHOLD && Math.abs(g.dx) > Math.abs(g.dy) * SCRUB_AXIS_RATIO;
        if (!horizontal && !scrubActiveRef.current) return;
        const width = Math.max(1, containerWidthRef.current);
        const d = durationRef.current;
        const windowSec = d > 0 ? d : 30;
        const delta = (g.dx / width) * windowSec;
        const target =
          d > 0
            ? Math.max(0, Math.min(d, scrubStartPosRef.current + delta))
            : Math.max(0, scrubStartPosRef.current + delta);
        if (!scrubActiveRef.current) {
          scrubActiveRef.current = true;
          if (singleTapTimer.current) {
            clearTimeout(singleTapTimer.current);
            singleTapTimer.current = null;
          }
          lastTapRef.current = null;
          setIsSeeking(true);
          isSeekingRef.current = true;
        }
        scrubTargetRef.current = target;
        setPosition(target);
        setScrubOverlay({ delta: target - scrubStartPosRef.current, target });
      },
      onPanResponderRelease: (e: GestureResponderEvent) => {
        if (scrubActiveRef.current) {
          const target = scrubTargetRef.current;
          scrubActiveRef.current = false;
          setScrubOverlay(null);
          seekAbsoluteRef.current(target);
          setIsSeeking(false);
          isSeekingRef.current = false;
          resetHideTimerRef.current();
          return;
        }
        const x = e.nativeEvent.locationX ?? grantXRef.current;
        handleSurfaceTapRef.current(x);
      },
      onPanResponderTerminate: () => {
        if (scrubActiveRef.current) {
          scrubActiveRef.current = false;
          setScrubOverlay(null);
          seekAbsoluteRef.current(scrubTargetRef.current);
          setIsSeeking(false);
          isSeekingRef.current = false;
        }
      },
    })
  ).current;

  return (
    <View
      style={[styles.container, { width: SCREEN_WIDTH, height: playerHeight }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) containerWidthRef.current = w;
      }}
    >
      <VideoView
        style={styles.media}
        player={expoPlayer}
        contentFit="contain"
        nativeControls={false}
        pointerEvents="none"
      />
      <View style={styles.gestureLayer} {...stablePan.panHandlers} />
      <YoutubePlayerOverlay
        visible={showControls}
        isPlaying={isPlaying}
        isMuted={isMuted}
        isLoading={isLoading}
        isSeeking={isSeeking}
        position={position}
        duration={duration}
        playbackRate={playbackRate}
        title={title}
        skipHint={showSkipHint}
        scrub={scrubOverlay}
        onPlayPause={handlePlayPause}
        onSkip={handleSkip}
        onMute={handleMuteToggle}
        onFullscreen={handleFullscreen}
        onCycleSpeed={handleCycleSpeed}
        onPrevVideo={onPrevVideo}
        onNextVideo={onNextVideo}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onSeekStart={handleSeekStart}
        onSeekRatio={handleSeekRatio}
        onSeekEnd={handleSeekComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  gestureLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
});
