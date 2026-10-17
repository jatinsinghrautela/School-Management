import React from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMobile } from "../../provider";
import { useFamily } from "../../daily-provider";
import { labels, sections, type Section } from "../../core/daily";
import { dailySections } from "../../core/capabilities";
import { DailyContent } from "../../components/daily-content";
import { ChildPicker } from "../../components/daily-menu";
import { Busy, Button, Copy } from "../../components/ui";
export default function Daily() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { session, state } = useMobile();
  const family = useFamily();
  if (
    !sections.includes(section as Section) ||
    !dailySections(state.identity?.user.role || "").includes(section)
  )
    return <Redirect href="/" />;
  const parent = state.identity?.user.role === "parent";
  const scope = `${session.scope()}:${family.childId}:${section}`;
  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 22,
          gap: 20,
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          paddingBottom: 24,
        }}
      >
        <Button
          label="Back to overview"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
        <Copy muted>{state.workspace?.school.name}</Copy>
        <Copy large>{labels[section as Section]}</Copy>
        {!parent ? (
          <Button
            label="Refresh school records"
            secondary
            disabled={state.busy}
            onPress={() => void session.selectSchool(state.schoolId)}
          />
        ) : null}
        {state.busy ? <Busy /> : null}
        {parent ? <ChildPicker /> : null}
        {state.busy ||
        (parent && (family.loading || !family.family?.child)) ? null : (
          <DailyContent key={scope} section={section as Section} />
        )}
        <Copy muted>Powered by Schoolglass Desk</Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
