import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  View,
} from "react-native";
import { usePathname } from "expo-router";
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let current = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (current) setReduced(v);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      current = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
/** A noticeable lift/zoom settles behind fixed navigation chrome. */
export function RouteStage({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [path, reduced, progress]);
  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <Animated.View
        style={{
          flex: 1,
          opacity: progress.interpolate({
            inputRange: [0, 0.35, 1],
            outputRange: [0.35, 1, 1],
          }),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 0.8, 1],
                outputRange: [0.935, 1.008, 1],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [34, 0],
              }),
            },
          ],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
