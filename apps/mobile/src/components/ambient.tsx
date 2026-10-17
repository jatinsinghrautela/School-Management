import Svg, { Defs, RadialGradient, Stop, Ellipse } from "react-native-svg";
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
        duration: 10000,
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
        testID="ambient-aurora"
        style={{
          position: "absolute",
          top: 40,
          right: -100,
          width: 340,
          height: 430,
          opacity: dark ? 0.7 : 0.8,
          transform: [
            {
              translateX: phase.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, -55, 0],
              }),
            },
            {
              translateY: phase.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 70, 0],
              }),
            },
            {
              scale: phase.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.18, 1],
              }),
            },
          ],
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 340 430">
          <Defs>
            <RadialGradient id="mint">
              <Stop
                offset="0"
                stopColor={dark ? "#388b8b" : "#8fd8c8"}
                stopOpacity=".8"
              />
              <Stop
                offset="1"
                stopColor={dark ? "#388b8b" : "#8fd8c8"}
                stopOpacity="0"
              />
            </RadialGradient>
            <RadialGradient id="violet">
              <Stop
                offset="0"
                stopColor={dark ? "#7764a9" : "#c2a9e9"}
                stopOpacity=".7"
              />
              <Stop
                offset="1"
                stopColor={dark ? "#7764a9" : "#c2a9e9"}
                stopOpacity="0"
              />
            </RadialGradient>
          </Defs>
          <Ellipse cx="160" cy="140" rx="170" ry="140" fill="url(#mint)" />
          <Ellipse cx="170" cy="295" rx="160" ry="135" fill="url(#violet)" />
        </Svg>
      </Animated.View>
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
