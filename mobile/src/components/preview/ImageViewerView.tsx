import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react-native";

interface Props {
  uri: string;
}

export const ImageViewerView: React.FC<Props> = ({ uri }) => {
  const [rotation, setRotation] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [showTools, setShowTools] = useState(true);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(3, prev + 0.5));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(1, prev - 0.5));
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setRotation(0);
  };

  return (
    <TouchableWithoutFeedback onPress={() => setShowTools((prev) => !prev)}>
      <View style={styles.container}>
        <View style={styles.imageWrapper}>
          <ExpoImage
            source={{ uri }}
            style={[
              styles.image,
              {
                transform: [{ rotate: `${rotation}deg` }, { scale: zoomScale }],
              },
            ]}
            contentFit="contain"
            transition={200}
          />
        </View>

        {/* Floating Photo Controls Bar */}
        {showTools && (
          <View style={styles.toolsBar}>
            <TouchableOpacity style={styles.toolBtn} onPress={handleRotate}>
              <RotateCw size={18} color="#ffffff" />
              <Text style={styles.toolLabel}>{rotation}°</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleZoomOut}
              disabled={zoomScale <= 1}
            >
              <ZoomOut size={18} color={zoomScale <= 1 ? "#737373" : "#ffffff"} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.zoomBadge} onPress={handleResetZoom}>
              <Text style={styles.zoomText}>{Math.round(zoomScale * 100)}%</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleZoomIn}
              disabled={zoomScale >= 3}
            >
              <ZoomIn size={18} color={zoomScale >= 3 ? "#737373" : "#ffffff"} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  toolsBar: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    elevation: 8,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
  },
  toolLabel: {
    color: "#d4d4d4",
    fontSize: 10,
    fontWeight: "700",
  },
  zoomBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  zoomText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
  },
});
