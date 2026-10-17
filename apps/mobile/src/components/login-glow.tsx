import React, { useEffect, useState } from "react";
import { Animated, AppState, Easing, Platform, View } from "react-native";
import { BrandMark } from "./hero";
import { useMobile } from "../provider";
import { useReducedMotion } from "./motion";
/** A slow backlight, never a flashing strobe; suspended when the app is inactive. */
export function LoginGlow() {
  const { colors } = useMobile();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (reduced || !active) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, reduced, pulse]);
  return (
    <View
      style={{ padding: 5, borderRadius: 13, backgroundColor: colors.hero }}
    >
      <Animated.View
        pointerEvents="none"
        testID="login-logo-glow"
        style={{
          position: "absolute",
          inset: -4,
          borderRadius: 19,
          borderWidth: 3,
          borderColor: colors.accent,
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.2, 0.8],
          }),
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.16],
              }),
            },
          ],
        }}
      />
      <BrandMark />
    </View>
  );
}
