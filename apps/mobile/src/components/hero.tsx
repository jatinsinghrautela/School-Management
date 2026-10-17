import React, { useCallback, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useMobile } from "../provider";

/** One decorative animation, with no layout updates or network activity. */
export function Hero({ title, detail }: { title: string; detail: string }) {
  const { dark, design } = useMobile();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    const app = AppState.addEventListener("change", (value) =>
      setActive(value === "active"),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  useEffect(() => {
    drift.setValue(0);
    if (reduced || !active || !focused) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 4200,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 4200,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, drift, focused, reduced]);
  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: dark ? "#153d38" : "#123f3a",
          borderRadius: design === "maximalism" ? 10 : 30,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.orbit,
          {
            transform: [
              {
                translateY: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -16],
                }),
              },
              { rotate: "-24deg" },
            ],
          },
        ]}
      >
        <View style={styles.sphere}>
          <BrandMark />
        </View>
      </Animated.View>
      <View
        accessibilityRole="image"
        accessibilityLabel="Schoolglass Desk logo"
        style={{
          alignSelf: "flex-start",
          padding: 8,
          borderRadius: 14,
          backgroundColor: "#2b6656",
        }}
      >
        <BrandMark />
      </View>
      <Text style={styles.eyebrow}>A LITTLE CLARITY. EVERY DAY.</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>LEARN · CONNECT · GROW</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: {
    padding: 26,
    borderRadius: 30,
    gap: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#548e7c",
  },
  eyebrow: {
    color: "#bce8da",
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "700",
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    maxWidth: 310,
  },
  detail: { color: "#d9ede6", fontSize: 15, lineHeight: 24, maxWidth: 340 },
  orbit: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#468270",
    right: -105,
    bottom: -125,
  },
  sphere: {
    width: 64,
    height: 64,
    borderRadius: 40,
    backgroundColor: "#3e8976",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: -18,
    left: 5,
    borderWidth: 6,
    borderColor: "#76bca4",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#24594d",
    borderWidth: 1,
    borderColor: "#609780",
  },
  badgeText: {
    color: "#eef9f3",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
});

export function BrandMark() {
  return (
    <View accessible={false} style={{ width: 30, height: 30 }}>
      <View
        style={{
          position: "absolute",
          left: 6,
          top: 2,
          width: 23,
          height: 23,
          borderWidth: 2,
          borderColor: "#e1fff0",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 17,
          top: 2,
          height: 23,
          borderLeftWidth: 2,
          borderColor: "#e1fff0",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 6,
          top: 13,
          width: 23,
          borderTopWidth: 2,
          borderColor: "#e1fff0",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 1,
          top: 8,
          width: 23,
          height: 21,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: "#e1fff0",
        }}
      />
    </View>
  );
}
