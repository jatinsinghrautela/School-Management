import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useReducedMotion } from "./motion";
import { useMobile } from "../provider";
/** One transform loop per focused page; no animation of layout or live blur. */
export function AmbientMotion() {
  const { dark, colors } = useMobile();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false),
    [active, setActive] = useState(AppState.currentState === "active");
  const [phase] = useState(() => new Animated.Value(0));
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) =>
      setActive(s === "active"),
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    phase.setValue(0);
    if (reduced || !active || !focused) return;
    const motion = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
        isInteraction: false,
      }),
    );
    motion.start();
    return () => motion.stop();
  }, [active, focused, phase, reduced]);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
    >
      <Animated.View
        testID="ambient-flow"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 88,
          height: 3,
          borderRadius: 4,
          backgroundColor: colors.accent,
          opacity: 0.65,
          transform: [
            {
              translateX: phase.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [-40, width - 48, -40],
              }),
            },
          ],
        }}
      />
      {[0, 1].map((i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: 210,
            height: 210,
            borderRadius: 105,
            borderWidth: 1.5,
            borderColor: dark ? "#427c8a" : "#8dbbd2",
            top: i ? undefined : 12,
            bottom: i ? 80 : undefined,
            left: i ? undefined : -135,
            right: i ? -130 : undefined,
            opacity: dark ? 0.65 : 0.7,
            transform: [
              {
                rotate: phase.interpolate({
                  inputRange: [0, 1],
                  outputRange: i ? ["360deg", "0deg"] : ["0deg", "360deg"],
                }),
              },
            ],
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 22,
              left: 25,
              width: 15,
              height: 15,
              borderRadius: 8,
              backgroundColor: dark ? "#82d9ca" : "#4b9a9c",
              borderWidth: 3,
              borderColor: dark ? "#253f50" : "#c5e5ee",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 20,
              right: 25,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: dark ? "#bca8eb" : "#9b87c5",
            }}
          />
        </Animated.View>
      ))}
    </View>
  );
}
