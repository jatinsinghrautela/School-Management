import { AmbientMotion } from "./ambient";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useMobile } from "../provider";
const Context = createContext<React.RefObject<View | null> | null>(null);
export function GlassBackdrop({ children }: { children: React.ReactNode }) {
  const target = useRef<View | null>(null);
  const { dark, colors } = useMobile();
  return (
    <Context.Provider value={target}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <BlurTargetView
          ref={target}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
        >
          <LinearGradient
            colors={
              dark
                ? ["#101b32", "#142b30", "#2b1e36"]
                : ["#e5efff", "#e4f6ee", "#f8e9f2"]
            }
            style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
          />
          <View
            style={{
              width: 260,
              height: 260,
              borderRadius: 150,
              backgroundColor: dark ? "#183b55" : "#c9e5fb",
              position: "absolute",
              left: -90,
              top: 70,
              opacity: 0.6,
            }}
          />
          <View
            style={{
              width: 240,
              height: 240,
              borderRadius: 150,
              backgroundColor: dark ? "#40304a" : "#eed7f4",
              position: "absolute",
              right: -120,
              top: 330,
              opacity: 0.5,
            }}
          />
        </BlurTargetView>
        {children}
      </View>
    </Context.Provider>
  );
}
/** Each stacked page covers earlier content while keeping the colour wash. */
export function GlassScene({ children }: { children: React.ReactNode }) {
  const { dark, colors } = useMobile();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        pointerEvents="none"
        colors={
          dark
            ? ["#101b32", "#142b30", "#2b1e36"]
            : ["#e5efff", "#e4f6ee", "#f8e9f2"]
        }
        style={StyleSheet.absoluteFill}
      />
      <AmbientMotion />
      {children}
    </View>
  );
}
/** Restrict live materials to navigation chrome; ordinary record cards stay inexpensive. */
export function GlassSurface({
  children,
  style,
  green = false,
  ...props
}: ViewProps & { green?: boolean }) {
  const target = useContext(Context);
  const { dark, colors } = useMobile();
  const [opaque, setOpaque] = useState(Platform.OS === "ios");
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((v) => {
        if (mounted) setOpaque(v);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setOpaque,
    );
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  const liquid =
    Platform.OS === "ios" &&
    !opaque &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable();
  return (
    <View
      {...props}
      style={[
        {
          overflow: "hidden",
          borderWidth: 1,
          borderColor: dark ? "#52677c" : "#ffffff",
          borderRadius: 26,
        },
        style,
      ]}
    >
      {opaque ? (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
        />
      ) : liquid ? (
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          isInteractive={green}
          colorScheme={dark ? "dark" : "light"}
          tintColor={green ? "#46bc8e55" : dark ? "#203e4b22" : "#edfff122"}
          style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
        />
      ) : (
        <BlurView
          pointerEvents="none"
          blurTarget={target || undefined}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={65}
          tint={dark ? "dark" : "light"}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: green
                ? dark
                  ? "rgba(43,100,83,0.45)"
                  : "rgba(163,227,199,0.50)"
                : dark
                  ? "rgba(20,35,49,0.85)"
                  : "rgba(250,253,255,0.82)",
            },
          ]}
        />
      )}
      {!opaque ? (
        <LinearGradient
          pointerEvents="none"
          colors={
            dark
              ? ["#bcecff25", "#ffffff00", "#7ed8c412"]
              : ["#ffffffaa", "#ffffff00", "#b8e1e833"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}
