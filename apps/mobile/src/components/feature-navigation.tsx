import React, { createContext, useContext, useState } from "react";
import {
  Linking,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { endpoint, useMobile } from "../provider";
import { featuresFor, type Feature } from "../core/features";
import { useReducedMotion } from "./motion";
import { Button, Copy, ErrorText } from "./ui";
const Context = createContext<((feature: Feature) => void) | null>(null);
export function FeatureNavigation({ children }: { children: React.ReactNode }) {
  const { session, state, colors } = useMobile();
  const reduced = useReducedMotion();
  const [notice, setNotice] = useState<{
    scope: string;
    feature: Feature;
  } | null>(null);
  const [error, setError] = useState("");
  function open(feature: Feature) {
    if (!feature.screen) {
      setError("");
      setNotice({ scope: session.scope(), feature });
      return;
    }
    if (feature.screen === "daily")
      router.push({
        pathname: "/daily/[section]",
        params: { section: feature.section! },
      });
    else if (feature.screen === "settings") router.navigate("/settings");
    else
      router.push({
        pathname: feature.screen === "work" ? "/work" : "/services",
        params: { section: feature.section! },
      });
  }
  const visible =
    !!notice &&
    notice.scope === session.scope() &&
    state.status === "ready" &&
    !state.identity?.user.passwordChangeRequired;
  return (
    <Context.Provider value={open}>
      <View
        style={{ flex: 1 }}
        aria-hidden={visible}
        importantForAccessibility={visible ? "no-hide-descendants" : "auto"}
      >
        {children}
      </View>
      <Modal
        transparent
        visible={visible}
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => setNotice(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,15,17,0.66)",
            justifyContent: "center",
            padding: 26,
          }}
        >
          <ScrollView
            {...(Platform.OS === "web"
              ? {}
              : { accessibilityViewIsModal: true })}
            contentContainerStyle={{ padding: 24, gap: 18 }}
            style={{
              flexGrow: 0,
              maxHeight: "100%",
              borderRadius: 26,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.bg,
              width: "100%",
              maxWidth: 420,
              alignSelf: "center",
            }}
          >
            <Copy large>Available on the website</Copy>
            <Copy>{notice?.feature.label}</Copy>
            <Copy muted>
              This feature is available from the website.{" "}
              {notice?.feature.reason}
            </Copy>
            <Copy muted>
              Sign in there with your school account. Your app session is not
              transferred.
            </Copy>
            <ErrorText message={error} />
            <Button
              label="Open website"
              onPress={() =>
                void Linking.openURL(new URL(endpoint).origin).catch(() =>
                  setError(
                    "Could not open the browser. Please open your school website manually.",
                  ),
                )
              }
            />
            <Button
              label="Stay in the app"
              secondary
              onPress={() => setNotice(null)}
            />
          </ScrollView>
        </View>
      </Modal>
    </Context.Provider>
  );
}
export function useFeatureNavigation() {
  const open = useContext(Context);
  if (!open) throw Error("Feature navigation missing");
  return open;
}
export function BottomBar() {
  const { state, colors } = useMobile();
  const inset = useSafeAreaInsets();
  const path = usePathname();
  const open = useFeatureNavigation();
  if (state.status !== "ready" || state.identity?.user.passwordChangeRequired)
    return null;
  const role = state.identity!.user.role;
  const first = featuresFor(role).find(
    (f) =>
      f.screen === (["student", "parent"].includes(role) ? "daily" : "work"),
  );
  const tabs = [
    {
      name: "Home",
      icon: "⌂",
      active: path === "/",
      action: () => router.dismissTo("/"),
    },
    {
      name: "School day",
      icon: "▤",
      active: path.startsWith("/daily") || path === "/work",
      action: () =>
        first
          ? open(first)
          : open({
              label: "Platform management",
              icon: "▣",
              reason: "Manage schools and organizations on the website.",
            }),
    },
    {
      name: "Services",
      icon: "▣",
      active: path === "/services",
      action: () =>
        role === "owner"
          ? open({ label: "Platform services", icon: "▣" })
          : router.navigate("/services"),
    },
    {
      name: "More",
      icon: "⊞",
      active: path === "/more" || path === "/settings",
      action: () => router.navigate("/more"),
    },
  ];
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Math.max(inset.bottom, 10),
        paddingTop: 10,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        flexDirection: "row",
        gap: 4,
      }}
    >
      {tabs.map((t) => (
        <Pressable
          key={t.name}
          accessibilityRole="button"
          accessibilityLabel={`Open ${t.name.toLowerCase()} tab`}
          accessibilityState={{ selected: t.active }}
          onPress={t.action}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            borderRadius: 16,
            backgroundColor: t.active ? colors.bg : "transparent",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              color: t.active ? colors.accent : colors.muted,
              fontSize: 24,
            }}
          >
            {t.icon}
          </Text>
          <Text
            style={{
              color: t.active ? colors.ink : colors.muted,
              fontSize: 10,
              fontWeight: "700",
            }}
          >
            {t.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
