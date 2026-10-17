import { TabProvider } from "../tab-provider";
import { TabSwipe } from "../components/tab-swipe";
import React from "react";
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import { needsSchoolChoice } from "../core/session";
import { GlassBackdrop, GlassScene, GlassContent } from "../components/glass";
import { TopBar } from "../components/top-bar";
import { View } from "react-native";
import { FeatureNavigation, BottomBar } from "../components/feature-navigation";
import { useReducedMotion } from "../components/motion";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileProvider, useMobile } from "../provider";
import { DailyProvider } from "../daily-provider";
function SceneLayout({
  children,
  route,
}: {
  children: React.ReactNode;
  route: { name: string };
}) {
  return route.name === "(tabs)" ? (
    <>{children}</>
  ) : (
    <GlassScene>{children}</GlassScene>
  );
}
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
        <GlassContent>
          <TabSwipe>
            <Stack
              screenLayout={SceneLayout}
              screenOptions={{
                animation: reduced ? "none" : "slide_from_right",
                animationDuration: 240,
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            >
              <Stack.Protected
                guard={
                  state.status !== "ready" ||
                  !!state.identity?.user.passwordChangeRequired
                }
              >
                <Stack.Screen name="login" options={{ animation: "none" }} />
              </Stack.Protected>
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
                <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
                <Stack.Screen name="settings" />
                <Stack.Screen name="service/[id]" />
                <Stack.Screen name="work" />
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
          </TabSwipe>
        </GlassContent>
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
          <TabProvider>
            <FeatureNavigation>
              <GlassBackdrop>
                <Navigation />
              </GlassBackdrop>
            </FeatureNavigation>
          </TabProvider>
        </DailyProvider>
      </MobileProvider>
    </SafeAreaProvider>
  );
}
