import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform } from "react-native";
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
      duration: 440,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [path, reduced, progress]);
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: progress,
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.94, 1],
            }),
          },
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
