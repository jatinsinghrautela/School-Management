import React from "react";
import { ScrollView } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMobile } from "../../provider";
import { useFamily } from "../../daily-provider";
import { allFeatures, featuresFor, featureId } from "../../core/features";
import type { Section } from "../../core/daily";
import {
  useWebsiteNotice,
  useFeatureNavigation,
} from "../../components/feature-navigation";
import { ChildPicker } from "../../components/daily-menu";
import { DailyContent } from "../../components/daily-content";
import { WorkContent } from "../../components/work-content";
import { ServiceContent } from "../../components/service-content";
import { Busy, Button, Card, Copy, ErrorText } from "../../components/ui";
export default function Service() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, session } = useMobile();
  const family = useFamily();
  const open = useFeatureNavigation(),
    website = useWebsiteNotice();
  const role = state.identity?.user.role || "";
  const feature = allFeatures(role).find((f) => featureId(f) === id);
  if (
    state.status !== "ready" ||
    state.identity?.user.passwordChangeRequired ||
    !feature
  )
    return <Redirect href="/services" />;
  const children = featuresFor(role).filter((f) =>
    feature.children?.includes(f.label),
  );
  const scope = `${session.scope()}:${family.childId}:${id}`;
  const parent = role === "parent";
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 20,
        gap: 20,
        paddingBottom: 120,
        maxWidth: 680,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Copy muted>{state.workspace?.school.name || "Schoolglass Desk"}</Copy>
      {feature.screen && role !== "owner" ? (
        <Button
          label="Refresh school records"
          secondary
          disabled={state.busy}
          onPress={() => void session.selectSchool(state.schoolId)}
        />
      ) : null}
      <ErrorText message={state.error} />
      {state.busy ? <Busy /> : null}
      {parent && (feature.screen === "daily" || feature.label === "Family") ? (
        <ChildPicker />
      ) : null}
      {!feature.screen ? (
        <Card>
          <Copy large>Available on the website</Copy>
          <Copy>{feature.reason}</Copy>
          <Button label="Use this feature" onPress={() => website(feature)} />
        </Card>
      ) : feature.screen === "group" ? (
        <>
          {feature.label === "Overview" ? (
            <Button
              label="Open dashboard"
              onPress={() => router.dismissTo("/")}
            />
          ) : null}
          {["Library", "Transport"].includes(feature.label) &&
          state.schoolId ? (
            <ServiceContent
              key={scope}
              tab="Library & transport"
              focus={feature.label as "Library" | "Transport"}
            />
          ) : (
            children.map((f) => (
              <Button
                key={f.label}
                label={f.label}
                secondary
                onPress={() => open(f)}
              />
            ))
          )}
          {!children.length && feature.label !== "Overview" ? (
            <Card>
              <Copy>
                This section is managed from the website for your role.
              </Copy>
              <Button
                label="Use this feature"
                onPress={() =>
                  website({
                    ...feature,
                    reason: "Use the full website for this school service.",
                  })
                }
              />
            </Card>
          ) : null}
        </>
      ) : !state.workspace ? (
        <Copy muted>
          {state.busy
            ? "Loading school records…"
            : "Open an assigned school workspace to use this service."}
        </Copy>
      ) : feature.screen === "daily" ? (
        !parent || (family.family?.child && !family.loading) ? (
          <DailyContent key={scope} section={feature.section as Section} />
        ) : null
      ) : feature.screen === "work" ? (
        <WorkContent key={scope} tab={feature.section!} />
      ) : feature.screen === "services" ? (
        <ServiceContent key={scope} tab={feature.section!} />
      ) : null}
      <Copy muted>Powered by Schoolglass Desk</Copy>
    </ScrollView>
  );
}
