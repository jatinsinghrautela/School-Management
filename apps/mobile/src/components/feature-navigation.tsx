import { useTabs } from "../tab-provider";
import { LiquidTabs } from "./liquid-tabs";
import React, { createContext, useContext, useState } from "react";
import { Linking, Platform, Modal, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { endpoint, useMobile } from "../provider";
import { featureId, type Feature } from "../core/features";
import { needsSchoolChoice } from "../core/session";
import { useReducedMotion } from "./motion";
import { Button, Copy, ErrorText } from "./ui";
const Context = createContext<{
  open: (feature: Feature) => void;
  website: (feature: Feature) => void;
} | null>(null);
export function FeatureNavigation({ children }: { children: React.ReactNode }) {
  const { session, state, colors } = useMobile();
  const reduced = useReducedMotion();
  const tabs = useTabs();
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
    router.navigate({
      pathname: "/service/[id]",
      params: {
        id: featureId(feature),
        tab:
          tabs.active === "home"
            ? ["daily", "work"].includes(feature.screen || "")
              ? "day"
              : "services"
            : tabs.active,
      },
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
  const tabs = useTabs();
  return tabs.enabled ? <LiquidTabs /> : null;
}
