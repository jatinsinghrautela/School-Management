import { sentenceLabel } from "../core/text";
import React from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { useMobile } from "../provider";
import { ChangePassword } from "../components/change-password";
import { Button, Card, Copy } from "../components/ui";
export default function Settings() {
  const { state, dark, toggle } = useMobile();
  if (state.status !== "ready" || state.identity?.user.passwordChangeRequired)
    return <Redirect href="/" />;
  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: 22,
          gap: 22,
          paddingBottom: 120,
          width: "100%",
          maxWidth: 620,
          alignSelf: "center",
        }}
      >
        <Button
          label="Back to overview"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
        <Copy large>Make yourself at home.</Copy>
        <Card>
          <Copy>{state.identity?.user.name}</Copy>
          <Copy muted>{state.identity?.user.email}</Copy>
          <Copy muted>{sentenceLabel(state.identity?.user.role || "")}</Copy>
        </Card>
        <Card>
          <Copy>Appearance</Copy>
          <Copy muted>
            Follows your device until you choose a mode. Your choice applies for
            this app session.
          </Copy>
          <Button
            label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onPress={toggle}
          />
        </Card>
        <ChangePassword />
        <Copy muted>
          Private school records are not stored offline in this preview.
          Sessions are checked when the app returns to the foreground.
        </Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
