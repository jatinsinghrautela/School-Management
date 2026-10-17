import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { useMobile } from "../provider";
import { featuresFor } from "../core/features";
import { useFeatureNavigation } from "../components/feature-navigation";
import { Button, Card, Copy, Field } from "../components/ui";
export default function More() {
  const { state, session, colors } = useMobile();
  const open = useFeatureNavigation();
  const [query, setQuery] = useState("");
  if (state.status !== "ready" || state.identity?.user.passwordChangeRequired)
    return <Redirect href="/" />;
  const features = featuresFor(state.identity!.user.role).filter((f) =>
    f.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          gap: 18,
          paddingBottom: 120,
          maxWidth: 620,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Copy large>Everything school.</Copy>
        <Copy muted>{state.workspace?.school.name || "Schoolglass Desk"}</Copy>
        <Field
          label="Search all features"
          value={query}
          onChangeText={setQuery}
        />
        {features.map((f) => (
          <Pressable
            key={f.label}
            accessibilityRole="button"
            accessibilityLabel={f.label}
            onPress={() => open(f)}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <Card>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <Text style={{ color: colors.accent, fontSize: 25, width: 30 }}>
                  {f.icon}
                </Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <Copy>{f.label}</Copy>
                  <Copy muted>
                    {f.screen ? "Available in the app" : "Website only"}
                  </Copy>
                </View>
                <Text style={{ color: colors.muted }}>↗</Text>
              </View>
            </Card>
          </Pressable>
        ))}
        {!features.length ? <Copy muted>No matching features.</Copy> : null}
        <Button
          label="Sign out"
          secondary
          onPress={() => void session.logout()}
        />
        <Copy muted>Powered by Schoolglass Desk</Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
