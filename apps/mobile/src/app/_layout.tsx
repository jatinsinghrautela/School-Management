import React from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
} from "expo-router";
import { needsSchoolChoice } from "../core/session";
import { GlassBackdrop, GlassScene } from "../components/glass";
import { TopBar } from "../components/top-bar";
import { View } from "react-native";
import { FeatureNavigation, BottomBar } from "../components/feature-navigation";
import { RouteStage, useReducedMotion } from "../components/motion";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileProvider, useMobile } from "../provider";
import { DailyProvider } from "../daily-provider";
function Navigation() {
  const { dark, colors, state } = useMobile();
  const reduced = useReducedMotion();
  const choice = needsSchoolChoice(state);
  return (
    <ThemeProvider
      value={{
        ...(dark ? DarkTheme : DefaultTheme),
        colors: {
          ...(dark ? DarkTheme : DefaultTheme).colors,
          background: "transparent",
          card: "transparent",
          text: colors.ink,
          primary: colors.accent,
          border: colors.line,
        },
      }}
    >
      <View style={{ flex: 1 }}>
        <StatusBar style={dark ? "light" : "dark"} />
        <TopBar />
        <RouteStage>
          <Stack
            screenLayout={({ children }) => <GlassScene>{children}</GlassScene>}
            screenOptions={{
              animation: reduced ? "none" : "slide_from_right",
              animationDuration: 240,
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Protected guard={choice}>
              <Stack.Screen name="choose-school" />
            </Stack.Protected>
            <Stack.Protected
              guard={
                state.status === "ready" &&
                !state.identity?.user.passwordChangeRequired &&
                !choice
              }
            >
              <Stack.Screen name="settings" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="service/[id]" />
              <Stack.Screen name="work" />
              <Stack.Screen name="services" />
              <Stack.Protected
                guard={[
                  "student",
                  "parent",
                  "teacher",
                  "staff",
                  "admin",
                  "principal",
                  "director",
                ].includes(state.identity?.user.role || "")}
              >
                <Stack.Screen name="daily/[section]" />
              </Stack.Protected>
            </Stack.Protected>
          </Stack>
        </RouteStage>
        <BottomBar />
      </View>
    </ThemeProvider>
  );
}
export default function Root() {
  return (
    <SafeAreaProvider>
      <MobileProvider>
        <DailyProvider>
          <FeatureNavigation>
            <GlassBackdrop>
              <Navigation />
            </GlassBackdrop>
          </FeatureNavigation>
        </DailyProvider>
      </MobileProvider>
    </SafeAreaProvider>
  );
}
