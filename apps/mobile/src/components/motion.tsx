import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Platform } from "react-native";
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
/** Native Stack handles device gestures; the web preview gets a short entry transition. */
export function RouteStage({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (Platform.OS !== "web" || reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
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
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
