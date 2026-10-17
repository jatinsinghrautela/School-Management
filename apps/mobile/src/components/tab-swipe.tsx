import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useMemo, useRef, useEffect } from "react";
import { Animated, Keyboard, PanResponder, Platform, View } from "react-native";
import { useTabs } from "../tab-provider";
import { useReducedMotion } from "./motion";
export function TabSwipe({ children }: { children: React.ReactNode }) {
  const inset = useSafeAreaInsets();
  const tabs = useTabs(),
    reduced = useReducedMotion();
  const keyboard = useRef(false),
    current = useRef(tabs);
  useEffect(() => {
    current.current = tabs;
  }, [tabs]);
  const [drag] = React.useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => {
        keyboard.current = true;
      }),
      b = Keyboard.addListener("keyboardDidHide", () => {
        keyboard.current = false;
      });
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  const pan = useMemo(
    () =>
      // The callbacks read the latest navigation only when a gesture occurs.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (event, g) => {
          if (Platform.OS === "web") {
            const t = event.nativeEvent.target as unknown as HTMLElement;
            if (t?.closest?.('input,textarea,button,[role="radio"]'))
              return false;
          }
          return (
            current.current.enabled &&
            !keyboard.current &&
            Math.abs(g.dx) > 28 &&
            Math.abs(g.dx) > Math.abs(g.dy) * 2
          );
        },
        onMoveShouldSetPanResponderCapture: (event, g) => {
          if (Platform.OS === "web") {
            const t = event.nativeEvent.target as unknown as HTMLElement;
            if (t?.closest?.('input,textarea,button,[role="radio"]'))
              return false;
          }
          return (
            current.current.enabled &&
            !keyboard.current &&
            Math.abs(g.dx) > 28 &&
            Math.abs(g.dx) > Math.abs(g.dy) * 2
          );
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          if (!reduced) drag.setValue(Math.max(-90, Math.min(90, g.dx * 0.45)));
        },
        onPanResponderRelease: (_, g) => {
          drag.setValue(0);
          if (Math.abs(g.dx) > 65 && Math.abs(g.dx) > Math.abs(g.dy) * 2)
            current.current.step(g.dx < 0 ? 1 : -1);
        },
        onPanResponderTerminate: () => drag.setValue(0),
      }),
    [drag, reduced],
  );
  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        paddingBottom: tabs.enabled ? Math.max(inset.bottom, 10) + 82 : 0,
      }}
      {...pan.panHandlers}
    >
      <Animated.View style={{ flex: 1, transform: [{ translateX: drag }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
