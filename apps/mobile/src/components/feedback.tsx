import React, { useCallback, useEffect, useState } from "react";
import { Animated, AppState, Easing, Platform, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useMobile } from "../provider";
import { useReducedMotion } from "./motion";
import { Icon } from "./icon";
/** Indeterminate: the animation never invents an upload percentage. */
export function LoadingMotion({
  label = "Loading",
  compact = false,
  tint,
}: {
  label?: string;
  compact?: boolean;
  tint?: string;
}) {
  const { colors } = useMobile();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [focused, setFocused] = useState(false);
  const [spin] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
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
    spin.setValue(0);
    pulse.setValue(0);
    if (reduced || !active || !focused) return;
    const driver = Platform.OS !== "web";
    const rotation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: driver,
        isInteraction: false,
      }),
    );
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: driver,
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 720,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: driver,
          isInteraction: false,
        }),
      ]),
    );
    rotation.start();
    breathing.start();
    return () => {
      rotation.stop();
      breathing.stop();
    };
  }, [active, focused, pulse, reduced, spin]);
  const size = compact ? 24 : 64;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: compact ? 0 : 16,
      }}
    >
      <View
        accessible={false}
        aria-hidden
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: compact ? 2 : 3,
            borderColor: colors.line,
            borderTopColor: tint || colors.accent,
            borderRightColor: "#799bdb",
            transform: [
              {
                rotate: spin.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
        />
        {!compact && (
          <Animated.View
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1.06],
                  }),
                },
              ],
            }}
          >
            <Icon name="school" size={24} color={colors.onAccent} />
          </Animated.View>
        )}
      </View>
      {!compact && (
        <Text
          style={{
            color: colors.ink,
            fontSize: 14,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
export function SavedMotion({ children }: { children: React.ReactNode }) {
  const { colors } = useMobile();
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) {
      scale.setValue(1);
      return;
    }
    scale.setValue(0.45);
    const animation = Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, scale]);
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ alignItems: "center", gap: 14, padding: 16 }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="check" color={colors.onAccent} size={30} />
      </Animated.View>
      {children}
    </View>
  );
}
