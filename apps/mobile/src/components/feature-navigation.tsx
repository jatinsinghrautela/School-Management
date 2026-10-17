import { Icon } from "./icon";
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
import { featuresFor, featureId, type Feature } from "../core/features";
import { needsSchoolChoice } from "../core/session";
import { GlassSurface } from "./glass";
import { useReducedMotion } from "./motion";
import { Button, Copy, ErrorText } from "./ui";
const Context = createContext<{
  open: (feature: Feature) => void;
  website: (feature: Feature) => void;
} | null>(null);
export function FeatureNavigation({ children }: { children: React.ReactNode }) {
  const { session, state, colors } = useMobile();
  const reduced = useReducedMotion();
  const [notice, setNotice] = useState<{
    scope: string;
    feature: Feature;
  } | null>(null);
  const [error, setError] = useState("");
  function website(feature: Feature) {
    setError("");
    setNotice({ scope: session.scope(), feature });
  }
  function open(feature: Feature) {
    if (feature.screen === "settings") {
      router.navigate("/profile");
      return;
    }
    router.push({
      pathname: "/service/[id]",
      params: { id: featureId(feature) },
    });
    if (!feature.screen) website(feature);
  }
  const visible =
    !!notice &&
    notice.scope === session.scope() &&
    state.status === "ready" &&
    !needsSchoolChoice(state) &&
    !state.identity?.user.passwordChangeRequired;
  return (
    <Context.Provider value={{ open, website }}>
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
  const context = useContext(Context);
  if (!context) throw Error("Feature navigation missing");
  return context.open;
}
export function useWebsiteNotice() {
  const context = useContext(Context);
  if (!context) throw Error("Feature navigation missing");
  return context.website;
}
export function BottomBar() {
  const { state, colors } = useMobile();
  const inset = useSafeAreaInsets();
  const path = usePathname();
  const open = useFeatureNavigation();
  if (
    state.status !== "ready" ||
    state.identity?.user.passwordChangeRequired ||
    needsSchoolChoice(state)
  )
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
      active:
        path.startsWith("/daily") ||
        path.startsWith("/service/") ||
        path === "/work",
      action: () => (first ? open(first) : router.navigate("/services")),
    },
    {
      name: "Services",
      icon: "▣",
      active: path === "/services",
      action: () => router.navigate("/services"),
    },
    {
      name: "Profile",
      icon: "♙",
      active: path === "/profile" || path === "/settings",
      action: () => router.navigate("/profile"),
    },
  ];
  return (
    <GlassSurface
      style={{
        position: "absolute",
        bottom: Math.max(inset.bottom, 10),
        left: 12,
        right: 12,
        paddingBottom: 10,
        paddingTop: 10,
        paddingHorizontal: 16,
        borderRadius: 30,
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
          <Icon
            name={t.name}
            color={t.active ? colors.accent : colors.muted}
            size={24}
          />
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
    </GlassSurface>
  );
}
