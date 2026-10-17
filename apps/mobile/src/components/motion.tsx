import { useTabs } from "../tab-provider";
import React, { useEffect, useState, useRef } from "react";
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
/** Directional tab entry; native stack retains service back gestures. */
export function RouteStage({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    tabs = useTabs(),
    reduced = useReducedMotion();
  const previous = useRef(tabs.index);
  const [direction, setDirection] = useState(0);
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    setDirection(
      tabs.index === previous.current
        ? 0
        : tabs.index > previous.current
          ? 1
          : -1,
    );
    previous.current = tabs.index;
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [path, tabs.index, reduced, progress]);
  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <Animated.View
        style={{
          flex: 1,
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.65, 1],
          }),
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [direction * 72, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [direction ? 0.975 : 0.99, 1],
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
