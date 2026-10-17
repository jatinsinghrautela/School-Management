import React from "react";
import { Easing, View, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { useMobile } from "../../provider";
import { needsSchoolChoice } from "../../core/session";
import { GlassScene } from "../../components/glass";
import { useReducedMotion } from "../../components/motion";
function Scene({
  children,
  route,
}: {
  children: React.ReactNode;
  route: { name: string };
}) {
  return (
    <View testID={`tab-page-${route.name}`} style={{ flex: 1 }}>
      <GlassScene>{children}</GlassScene>
    </View>
  );
}
/** One navigator owns both pages during a tab transition: no route-swap flash. */
export default function MainTabs() {
  const { width } = useWindowDimensions();
  const { state } = useMobile();
  const reduced = useReducedMotion();
  const ready =
    state.status === "ready" &&
    !state.identity?.user.passwordChangeRequired &&
    !needsSchoolChoice(state);
  return (
    <Tabs
      key={ready ? "school-tabs" : "public-tabs"}
      initialRouteName="index"
      backBehavior="initialRoute"
      tabBar={() => null}
      detachInactiveScreens={false}
      screenLayout={Scene}
      screenOptions={{
        headerShown: false,
        animation: reduced ? "none" : "shift",
        transitionSpec: {
          animation: "timing",
          config: {
            duration: reduced ? 0 : 380,
            easing: Easing.bezier(0.22, 0.68, 0, 1),
          },
        },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-width, 0, width],
                }),
              },
            ],
          },
        }),
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Protected guard={ready}>
        <Tabs.Screen name="school-day" />
        <Tabs.Screen name="services" />
        <Tabs.Screen name="profile" />
      </Tabs.Protected>
    </Tabs>
  );
}
