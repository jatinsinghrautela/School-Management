import React from "react";
import { View } from "react-native";
import { FeatureNavigation, BottomBar } from "../components/feature-navigation";
import { RouteStage, useReducedMotion } from "../components/motion";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileProvider, useMobile } from "../provider";
import { DailyProvider } from "../daily-provider";
function Navigation() {
  const { dark, colors, state } = useMobile();
  const reduced = useReducedMotion();
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={dark ? "light" : "dark"} />
      <RouteStage>
        <Stack
          screenOptions={{
            animation: reduced ? "none" : "slide_from_right",
            animationDuration: 240,
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Protected
            guard={
              state.status === "ready" &&
              !state.identity?.user.passwordChangeRequired
            }
          >
            <Stack.Screen name="settings" />
            <Stack.Screen name="more" />
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
  );
}
export default function Root() {
  return (
    <SafeAreaProvider>
      <MobileProvider>
        <DailyProvider>
          <FeatureNavigation>
            <Navigation />
          </FeatureNavigation>
        </DailyProvider>
      </MobileProvider>
    </SafeAreaProvider>
  );
}
