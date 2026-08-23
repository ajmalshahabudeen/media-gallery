import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  BackHandler,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { YoutubePlayerOverlay, nextPlaybackRate } from "../components/preview/youtube-player-overlay";
import { getPlaybackSession, updatePlaybackSession, setPlaybackSession } from "../lib/playback-session";

let ScreenOrientation: any = null;
try {
  ScreenOrientation = require("expo-screen-orientation");
} catch {
  // not available
}

let Brightness: { getBrightnessAsync?: () => Promise<number>; setBrightnessAsync?: (v: number) => Promise<void> } | null =
  null;
try {
  Brightness = require("expo-brightness");
} catch {
  Brightness = null;
}

const DOUBLE_TAP_MS = 300;
const ZONE_LEFT = 0.35;
const ZONE_RIGHT = 0.65;
const SCRUB_DX_THRESHOLD = 14;
const SCRUB_AXIS_RATIO = 1.15;
const SIDE_ZONE = 0.22;
const SIDE_DY_THRESHOLD = 10;

export default function FullscreenVideoScreen() {
  const params = useLocalSearchParams<{ uri: string; title?: string; startAt?: string }>();
  const router = useRouter();
  const initialSession = getPlaybackSession();
  const [activeIndex, setActiveIndex] = useState(initialSession?.index ?? 0);
  const items =
    initialSession?.items && initialSession.items.length > 0
      ? initialSession.items
      : [{ uri: params.uri || "", title: params.title || "Video" }];
  const uri = items[Math.max(0, Math.min(items.length - 1, activeIndex))]?.uri || params.uri || "";
  const title = items[Math.max(0, Math.min(items.length - 1, activeIndex))]?.title || params.title || "Video";
  const startAt = initialSession?.startAt ?? Number(params.startAt || 0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(initialSession?.muted ?? false);
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState(startAt);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showSkipHint, setShowSkipHint] = useState<"back" | "fwd" | null>(null);
  const [scrubOverlay, setScrubOverlay] = useState<{
    delta: number;
    target: number;
  } | null>(null);
  const [playbackRate, setPlaybackRate] = useState(initialSession?.rate ?? 1);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [sideHud, setSideHud] = useState<{ kind: "volume" | "brightness"; value: number } | null>(null);

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenDims = Dimensions.get("screen");

  const positionRef = useRef(startAt);
  const durationRef = useRef(0);
  const isSeekingRef = useRef(false);
  const containerWidthRef = useRef(screenDims.width);
  const containerHeightRef = useRef(screenDims.height);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const scrubActiveRef = useRef(false);
  const sideActiveRef = useRef<"volume" | "brightness" | null>(null);
  const sideStartRef = useRef(0);
  const volumeRef = useRef(1);
  const brightnessRef = useRef(1);
  const scrubStartPosRef = useRef(0);
  const scrubTargetRef = useRef(0);
  const grantXRef = useRef(0);
  const appliedInitialSeek = useRef(false);

  const expoPlayer = useVideoPlayer(uri, (player: any) => {
    player.loop = false;
    player.muted = initialSession?.muted ?? false;
    player.volume = 1;
    if (initialSession?.rate) player.playbackRate = initialSession.rate;
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
          expoPlayer.muted = isMuted;
          expoPlayer.volume = volumeRef.current;
          expoPlayer.playbackRate = playbackRate;
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
    if (ScreenOrientation) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    }
    if (Brightness?.getBrightnessAsync) {
      Brightness.getBrightnessAsync()
        .then((value) => {
          const next = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
          setBrightness(next);
          brightnessRef.current = next;
        })
        .catch(() => {});
    }
    return () => {
      if (ScreenOrientation) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    };
  }, []);

  const handleExit = useCallback(() => {
    const session = getPlaybackSession();
    session?.onExit?.(positionRef.current, activeIndex);
    setPlaybackSession(null);
    if (expoPlayer) {
      try {
        expoPlayer.pause();
      } catch {
        // ignore
      }
    }
    router.back();
  }, [activeIndex, expoPlayer, router]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      handleExit();
      return true;
    });
    return () => backHandler.remove();
  }, [handleExit]);

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
  }, [expoPlayer, uri]);

  useEffect(() => {
    setIsLoading(true);
    if (appliedInitialSeek.current) {
      setPosition(0);
      positionRef.current = 0;
    }
  }, [uri]);

  useEffect(() => {
    if (!expoPlayer) return;
    const applyStart = () => {
      if (appliedInitialSeek.current) return;
      appliedInitialSeek.current = true;
      if (startAt > 0.2) {
        try {
          expoPlayer.currentTime = startAt;
          setPosition(startAt);
          positionRef.current = startAt;
        } catch {
          // ignore
        }
      }
    };
    const timeSub = expoPlayer.addListener("timeUpdate", (event: any) => {
      if (!isSeekingRef.current) setPosition(event.currentTime || 0);
      const d = event.duration || expoPlayer.duration;
      if (d && d > 0 && isFinite(d)) setDuration(d);
      setIsLoading(false);
    });
    const statusSub = expoPlayer.addListener("statusChange", (status: any) => {
      const statusStr = typeof status === "string" ? status : status?.status;
      if (statusStr === "readyToPlay") {
        setIsLoading(false);
        applyStart();
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
  }, [activeIndex, expoPlayer, startAt]);

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

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= items.length) return;
      setActiveIndex(nextIndex);
      updatePlaybackSession({ index: nextIndex, startAt: 0 });
      getPlaybackSession()?.onIndexChange?.(nextIndex);
      setPosition(0);
      positionRef.current = 0;
    },
    [items.length]
  );

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

  const applyVolume = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(1, next));
      volumeRef.current = clamped;
      setVolume(clamped);
      if (expoPlayer) {
        try {
          expoPlayer.volume = clamped;
          expoPlayer.muted = clamped <= 0.001;
          setIsMuted(clamped <= 0.001);
        } catch {
          // ignore
        }
      }
      setSideHud({ kind: "volume", value: clamped });
    },
    [expoPlayer]
  );

  const applyBrightness = useCallback((next: number) => {
    const clamped = Math.max(0.05, Math.min(1, next));
    brightnessRef.current = clamped;
    setBrightness(clamped);
    if (Brightness?.setBrightnessAsync) {
      Brightness.setBrightnessAsync(clamped).catch(() => {});
    }
    setSideHud({ kind: "brightness", value: clamped });
  }, []);

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
  const applyVolumeRef = useRef(applyVolume);
  const applyBrightnessRef = useRef(applyBrightness);
  useEffect(() => {
    seekAbsoluteRef.current = seekAbsolute;
    handleSurfaceTapRef.current = handleSurfaceTap;
    resetHideTimerRef.current = resetHideTimer;
    applyVolumeRef.current = applyVolume;
    applyBrightnessRef.current = applyBrightness;
  }, [applyBrightness, applyVolume, handleSurfaceTap, resetHideTimer, seekAbsolute]);

  const stablePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) => {
        const width = Math.max(1, containerWidthRef.current);
        const x = grantXRef.current;
        const onSide = x < width * SIDE_ZONE || x > width * (1 - SIDE_ZONE);
        if (onSide && Math.abs(g.dy) > SIDE_DY_THRESHOLD && Math.abs(g.dy) > Math.abs(g.dx)) {
          return true;
        }
        return Math.abs(g.dx) > SCRUB_DX_THRESHOLD && Math.abs(g.dx) > Math.abs(g.dy) * SCRUB_AXIS_RATIO;
      },
      onPanResponderTerminationRequest: () => !scrubActiveRef.current && !sideActiveRef.current,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        scrubActiveRef.current = false;
        sideActiveRef.current = null;
        scrubStartPosRef.current = positionRef.current;
        scrubTargetRef.current = positionRef.current;
        grantXRef.current = e.nativeEvent.locationX ?? 0;
      },
      onPanResponderMove: (_e, g: PanResponderGestureState) => {
        const width = Math.max(1, containerWidthRef.current);
        const height = Math.max(1, containerHeightRef.current);
        const x = grantXRef.current;
        const onLeft = x < width * SIDE_ZONE;
        const onRight = x > width * (1 - SIDE_ZONE);
        const vertical = Math.abs(g.dy) > SIDE_DY_THRESHOLD && Math.abs(g.dy) > Math.abs(g.dx);
        if ((onLeft || onRight) && (vertical || sideActiveRef.current)) {
          if (!sideActiveRef.current) {
            sideActiveRef.current = onLeft ? "brightness" : "volume";
            sideStartRef.current = onLeft ? brightnessRef.current : volumeRef.current;
            if (singleTapTimer.current) {
              clearTimeout(singleTapTimer.current);
              singleTapTimer.current = null;
            }
            lastTapRef.current = null;
          }
          const delta = -g.dy / height;
          const next = sideStartRef.current + delta;
          if (sideActiveRef.current === "volume") applyVolumeRef.current(next);
          else applyBrightnessRef.current(next);
          return;
        }
        const horizontal =
          Math.abs(g.dx) > SCRUB_DX_THRESHOLD && Math.abs(g.dx) > Math.abs(g.dy) * SCRUB_AXIS_RATIO;
        if (!horizontal && !scrubActiveRef.current) return;
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
        if (sideActiveRef.current) {
          sideActiveRef.current = null;
          setSideHud(null);
          resetHideTimerRef.current();
          return;
        }
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
        if (sideActiveRef.current) {
          sideActiveRef.current = null;
          setSideHud(null);
        }
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

  const dim = Brightness?.setBrightnessAsync ? 0 : 1 - brightness;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        const h = e.nativeEvent.layout.height;
        if (w > 0) containerWidthRef.current = w;
        if (h > 0) containerHeightRef.current = h;
      }}
    >
      <StatusBar hidden />
      <VideoView
        style={[styles.video, { width: screenDims.width, height: screenDims.height }]}
        player={expoPlayer}
        contentFit="contain"
        nativeControls={false}
        pointerEvents="none"
      />
      {dim > 0.02 ? (
        <View pointerEvents="none" style={[styles.dim, { opacity: Math.min(0.72, dim) }]} />
      ) : null}
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
        fullscreen
        skipHint={showSkipHint}
        scrub={scrubOverlay}
        sideHud={sideHud}
        onPlayPause={handlePlayPause}
        onSkip={handleSkip}
        onMute={handleMuteToggle}
        onBack={handleExit}
        onCycleSpeed={handleCycleSpeed}
        onPrevVideo={() => goToIndex(activeIndex - 1)}
        onNextVideo={() => goToIndex(activeIndex + 1)}
        hasPrev={activeIndex > 0}
        hasNext={activeIndex < items.length - 1}
        onSeekStart={handleSeekStart}
        onSeekRatio={handleSeekRatio}
        onSeekEnd={handleSeekComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
    zIndex: 2,
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
