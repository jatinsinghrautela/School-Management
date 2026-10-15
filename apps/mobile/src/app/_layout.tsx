import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileProvider, useMobile } from "../provider";
import { DailyProvider } from "../daily-provider";
function Navigation() {
  const { dark, colors, state } = useMobile();
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
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
          <Stack.Protected
            guard={["student", "parent"].includes(
              state.identity?.user.role || "",
            )}
          >
            <Stack.Screen name="daily/[section]" />
          </Stack.Protected>
        </Stack.Protected>
      </Stack>
    </>
  );
}
export default function Root() {
  return (
    <SafeAreaProvider>
      <MobileProvider>
        <DailyProvider>
          <Navigation />
        </DailyProvider>
      </MobileProvider>
    </SafeAreaProvider>
  );
}
