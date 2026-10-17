import React, { useEffect, useState } from "react";
import { Animated, Platform, Text, View } from "react-native";
import { useMobile } from "../provider";
import { useReducedMotion } from "./motion";
import { Icon } from "./icon";
import { LogoMotion } from "./logo-motion";
/** Branded indeterminate loader; never invents a completion percentage. */
export function LoadingMotion({
  label = "Loading",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
  tint?: string;
}) {
  const { colors } = useMobile();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: compact ? 0 : 12,
      }}
    >
      <LogoMotion size={compact ? 26 : 64} shatter />
      {!compact ? (
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
      ) : null}
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
