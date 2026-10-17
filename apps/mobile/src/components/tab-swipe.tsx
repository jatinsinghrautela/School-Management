import React, { useState, useRef, useEffect } from "react";
import { Keyboard, PanResponder, Platform, View } from "react-native";
import { useTabs } from "../tab-provider";
export function TabSwipe({ children }: { children: React.ReactNode }) {
  const tabs = useTabs();
  const keyboard = useRef(false),
    current = useRef(tabs);
  useEffect(() => {
    current.current = tabs;
  }, [tabs]);
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
  // Responder callbacks only access these refs when an input event occurs.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
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
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 65 && Math.abs(g.dx) > Math.abs(g.dy) * 2) {
          current.current.step(g.dx < 0 ? 1 : -1);
        }
      },
    }),
  );
  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
      }}
      {...pan.panHandlers}
    >
      {children}
    </View>
  );
}
