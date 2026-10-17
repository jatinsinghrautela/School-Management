import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { BrandMark } from "./hero";
import { useMobile } from "../provider";
import { useReducedMotion } from "./motion";
/** Original brand with a circulating gradient frame and a travelling light sweep. */
export function LogoMotion({
  size = 64,
  testID = "schoolglass-logo-motion",
}: {
  size?: number;
  testID?: string;
}) {
  const { colors } = useMobile();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [focused, setFocused] = useState(false);
  const [phase] = useState(() => new Animated.Value(0));
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (value) =>
      setActive(value === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    phase.setValue(0);
    if (reduced || !active || !focused) return;
    const animation = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
        isInteraction: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [active, focused, phase, reduced]);
  const radius = size * 0.29;
  return (
    <View
      testID={testID}
      accessible={false}
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        shadowColor: "#45dfc0",
        shadowOpacity: 0.35,
        shadowRadius: size * 0.22,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: radius,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.hero,
        }}
      >
        <Animated.View
          testID={`${testID}-gradient`}
          style={{
            position: "absolute",
            width: size * 1.5,
            height: size * 1.5,
            transform: [
              {
                rotate: phase.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={["#a5fff1", "#33cdb0", "#7c84ff", "#f1b5ff", "#a5fff1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View
          style={{
            position: "absolute",
            inset: size > 30 ? 2.5 : 1.5,
            borderRadius: radius - 2,
            backgroundColor: colors.hero,
          }}
        />
        <View
          style={{ width: 30, height: 30, transform: [{ scale: size / 48 }] }}
        >
          <BrandMark />
        </View>
        {!reduced ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -size / 2,
              bottom: -size / 2,
              width: size * 0.45,
              transform: [
                {
                  translateX: phase.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-size * 1.2, size * 1.2],
                  }),
                },
                { rotate: "24deg" },
              ],
            }}
          >
            <LinearGradient
              colors={["#ffffff00", "#c5fff555", "#ffffff00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
