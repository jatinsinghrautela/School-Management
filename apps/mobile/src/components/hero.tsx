import React, { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, Animated, AppState, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useMobile } from "../provider";

/** One decorative animation, with no layout updates or network activity. */
export function Hero({ title, detail }: { title: string; detail: string }) {
  const { dark } = useMobile();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    const app = AppState.addEventListener("change", (value) => setActive(value === "active"));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    drift.setValue(0);
    if (reduced || !active || !focused) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 4200, useNativeDriver: true, isInteraction: false }),
      Animated.timing(drift, { toValue: 0, duration: 4200, useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [active, drift, focused, reduced]);
  return (
    <View style={[styles.hero, { backgroundColor: dark ? "#202e56" : "#293d78" }]}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.orbit, { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }, { rotate: "-24deg" }] }]}>
        <View style={styles.sphere} />
      </Animated.View>
      <Text style={styles.eyebrow}>A LITTLE CLARITY. EVERY DAY.</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>LEARN · CONNECT · GROW</Text></View>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: { padding: 26, borderRadius: 30, gap: 16, overflow: "hidden", borderWidth: 1, borderColor: "#6479af" },
  eyebrow: { color: "#d2ddff", fontSize: 10, letterSpacing: 1.8, fontWeight: "700" },
  title: { color: "#ffffff", fontSize: 32, lineHeight: 39, fontWeight: "800", maxWidth: 310 },
  detail: { color: "#e0e8ff", fontSize: 15, lineHeight: 24, maxWidth: 340 },
  orbit: { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: "#657cb3", right: -110, top: 35 },
  sphere: { width: 75, height: 75, borderRadius: 40, backgroundColor: "#6174aa", position: "absolute", top: -15, left: 40, borderWidth: 6, borderColor: "#8094c1" },
  badge: { alignSelf: "flex-start", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#354d88", borderWidth: 1, borderColor: "#7287ba" },
  badgeText: { color: "#eef2ff", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
});

