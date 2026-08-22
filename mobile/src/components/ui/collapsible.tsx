import { PropsWithChildren, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.heading, pressed && styles.pressedHeading]}
        onPress={() => setIsOpen((value) => !value)}
      >
        <View style={styles.button}>
          <ChevronRight
            size={14}
            color="#e5e5e5"
            style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pressedHeading: {
    opacity: 0.7,
  },
  button: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#171717",
  },
  title: {
    color: "#e5e5e5",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    marginTop: 12,
    borderRadius: 12,
    marginLeft: 24,
    padding: 16,
    backgroundColor: "#171717",
  },
});
