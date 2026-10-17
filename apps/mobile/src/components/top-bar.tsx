import { BrandMark } from "./hero";
import { Icon } from "./icon";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { useMobile } from "../provider";
import { allFeatures, featureId } from "../core/features";
import { needsSchoolChoice } from "../core/session";
import { GlassSurface } from "./glass";
export function TopBar() {
  const { state, session, colors } = useMobile();
  const path = usePathname();
  const id = decodeURIComponent(path.split("/").at(-1) || "");
  const ready = state.status === "ready";
  const selection = needsSchoolChoice(state);
  const feature = allFeatures(state.identity?.user.role || "").find(
    (f) => featureId(f) === id,
  );
  const school = state.identity?.schools.find(
    (s) => s.id === state.schoolId,
  )?.name;
  const title = !ready
    ? "Schoolglass Desk"
    : state.identity?.user.passwordChangeRequired
      ? "Change password"
      : selection
        ? "Choose your school"
        : path === "/"
          ? school || "Schoolglass Desk"
          : path.startsWith("/service/")
            ? feature?.label || "School service"
            : path === "/profile"
              ? "Profile"
              : path === "/services"
                ? "Services"
                : path === "/settings"
                  ? "Account & appearance"
                  : "School workspace";
  const back =
    ready && !selection && !["/", "/services", "/profile"].includes(path);
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 }}
    >
      <GlassSurface style={{ borderRadius: 22, borderColor: colors.line }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            minHeight: 60,
          }}
        >
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.dismissTo("/")
              }
              style={{
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon name="back" color={colors.accent} size={24} />
            </Pressable>
          ) : null}
          {!back ? (
            <View
              style={{
                backgroundColor: colors.hero,
                padding: 5,
                borderRadius: 13,
              }}
            >
              <BrandMark />
            </View>
          ) : null}
          <Text
            accessibilityRole="header"
            style={{
              flex: 1,
              color: colors.ink,
              fontWeight: "800",
              fontSize: 16,
              lineHeight: 21,
              paddingVertical: 8,
            }}
          >
            {title}
          </Text>
          {ready ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={() => void session.logout()}
              style={{
                minWidth: 52,
                gap: 2,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 5,
              }}
            >
              <Icon name="logout" color={colors.accent} size={19} />
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 10,
                  fontWeight: "700",
                }}
              >
                Sign out
              </Text>
            </Pressable>
          ) : null}
        </View>
      </GlassSurface>
    </SafeAreaView>
  );
}
