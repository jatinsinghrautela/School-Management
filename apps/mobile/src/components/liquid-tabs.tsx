import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabs } from "../tab-provider";
import { useMobile } from "../provider";
import { GlassSurface } from "./glass";
import { useReducedMotion } from "./motion";
import { Icon } from "./icon";
export function LiquidTabs() {
  const tabs = useTabs(),
    { colors, dark } = useMobile(),
    insets = useSafeAreaInsets(),
    reduced = useReducedMotion();
  const [width, setWidth] = useState(0),
    [position] = useState(() => new Animated.Value(0)),
    [stretch] = useState(() => new Animated.Value(1));
  const current = useRef({ tabs, width, reduced });
  useEffect(() => {
    current.current = { tabs, width, reduced };
  }, [tabs, width, reduced]);
  const origin = useRef(0);
  const driver = Platform.OS !== "web";
  useEffect(() => {
    position.stopAnimation();
    if (reduced) {
      position.setValue((tabs.index * width) / 4);
      return;
    }
    const animation = Animated.spring(position, {
      toValue: (tabs.index * width) / 4,
      friction: 8,
      tension: 110,
      useNativeDriver: driver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [tabs.index, width, reduced, position, driver]);
  const settle = useCallback(() => {
    if (reduced) {
      stretch.setValue(1);
      return;
    }
    Animated.spring(stretch, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: driver,
      isInteraction: false,
    }).start();
  }, [driver, reduced, stretch]);
  const pan = useMemo(
    () =>
      // Responder callbacks run on input events, not during render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          position.stopAnimation();
          origin.current =
            (current.current.tabs.index * current.current.width) / 4;
          if (!current.current.reduced) stretch.setValue(1.12);
        },
        onPanResponderMove: (_, g) => {
          position.setValue(
            Math.max(
              0,
              Math.min(current.current.width * 0.75, origin.current + g.dx),
            ),
          );
        },
        onPanResponderRelease: (_, g) => {
          const c = current.current,
            index = Math.max(
              0,
              Math.min(
                3,
                Math.round((origin.current + g.dx) / (c.width / 4 || 1)),
              ),
            );
          settle();
          c.tabs.go(index);
          // A changed tab is animated by the index effect alone.
          if (index !== c.tabs.index) return;
          if (c.reduced) {
            position.setValue((index * c.width) / 4);
            return;
          }
          Animated.spring(position, {
            toValue: (index * c.width) / 4,
            friction: 8,
            tension: 110,
            useNativeDriver: driver,
            isInteraction: false,
          }).start();
        },
        onPanResponderTerminate: () => {
          settle();
          if (current.current.reduced) {
            position.setValue(
              (current.current.tabs.index * current.current.width) / 4,
            );
            return;
          }
          Animated.spring(position, {
            toValue: (current.current.tabs.index * current.current.width) / 4,
            useNativeDriver: driver,
            isInteraction: false,
          }).start();
        },
      }),
    [position, stretch, driver, settle],
  );
  const names = ["Home", "School day", "Services", "Profile"];
  const inactiveInk = dark ? "#d0dfdf" : "#344f53";
  return (
    <GlassSurface
      floating
      style={{
        position: "absolute",
        bottom: Math.max(insets.bottom, 10),
        left: 12,
        right: 12,
        padding: 8,
        borderRadius: 30,
        borderColor: colors.line,
        shadowColor: "#071c24",
        shadowOpacity: 0.16,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ flexDirection: "row", minHeight: 58 }}
        {...pan.panHandlers}
      >
        {width > 0 ? (
          <Animated.View
            pointerEvents="none"
            testID="liquid-tab-indicator"
            style={{
              position: "absolute",
              left: 4,
              top: 1,
              bottom: 1,
              width: width / 4 - 8,
              transform: [
                { translateX: position },
                { scaleX: stretch },
                {
                  scaleY: stretch.interpolate({
                    inputRange: [1, 1.12],
                    outputRange: [1, 0.96],
                  }),
                },
              ],
            }}
          >
            <GlassSurface
              green
              style={{
                flex: 1,
                borderRadius: 22,
                borderColor: dark ? "#81ccb590" : "#418e7670",
                shadowColor: colors.accent,
                shadowOpacity: 0.15,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 3 },
              }}
            >
              <View
                style={{
                  height: 1,
                  backgroundColor: dark ? "#c9fff566" : "#ffffffee",
                  marginHorizontal: 14,
                  marginTop: 3,
                }}
              />
            </GlassSurface>
          </Animated.View>
        ) : null}
        {names.map((name, i) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`Open ${name.toLowerCase()} tab`}
            accessibilityState={{ selected: tabs.index === i }}
            aria-current={tabs.index === i ? "page" : undefined}
            onPress={() => tabs.go(i)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 58,
              gap: 4,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: tabs.index === i ? 1.04 : 1 }],
            })}
          >
            <Icon
              name={name}
              color={tabs.index === i ? colors.ink : inactiveInk}
              size={24}
            />
            <Text
              style={{
                color: tabs.index === i ? colors.ink : inactiveInk,
                fontSize: 10,
                fontWeight: tabs.index === i ? "800" : "600",
              }}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
    </GlassSurface>
  );
}
