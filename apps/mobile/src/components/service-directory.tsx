import { Icon } from "./icon";
import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Redirect } from "expo-router";
import { useMobile } from "../provider";
import { featuresFor, sidebarFeatures } from "../core/features";
import { useFeatureNavigation } from "./feature-navigation";
import { Card, Copy, Field } from "./ui";
export function ServiceDirectory() {
  const { state, colors } = useMobile();
  const open = useFeatureNavigation();
  const [query, setQuery] = useState("");
  if (state.status !== "ready" || state.identity?.user.passwordChangeRequired)
    return <Redirect href="/" />;
  const role = state.identity!.user.role;
  const groups = sidebarFeatures(role),
    actions = featuresFor(role);
  const matches = query.trim()
    ? [
        ...groups,
        ...actions.filter((f) => !groups.some((g) => g.label === f.label)),
      ].filter((f) =>
        f.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : groups;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 20,
        gap: 16,
        paddingBottom: 24,
        maxWidth: 640,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Copy muted>All your school services, in one place.</Copy>
      <Field label="Search services" value={query} onChangeText={setQuery} />
      {matches.map((f, index) => (
        <Pressable
          key={`${f.screen}:${f.label}`}
          accessibilityRole="button"
          accessibilityLabel={f.label}
          onPress={() => open(f)}
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        >
          <Card>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 17,
                  backgroundColor: ["#dce8fb", "#efe1f4", "#f7e4d2", "#d6ede6"][
                    index % 4
                  ],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={f.label} color="#205a60" size={26} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Copy>{f.label}</Copy>
                <Copy muted>
                  {f.screen === "group"
                    ? "Explore this service"
                    : f.screen
                      ? "Available in the app"
                      : "Website only"}
                </Copy>
              </View>
              <Icon name="arrow" color={colors.accent} size={20} />
            </View>
          </Card>
        </Pressable>
      ))}
      {!matches.length ? <Copy muted>No matching services.</Copy> : null}
      <Copy muted>Powered by Schoolglass Desk</Copy>
    </ScrollView>
  );
}
