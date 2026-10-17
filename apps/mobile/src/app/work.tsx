import React, { useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { featuresFor } from "../core/features";
import { useMobile } from "../provider";
import { WorkContent } from "../components/work-content";
import { Busy, Button, Copy, ErrorText } from "../components/ui";
import { Pick, choices } from "../components/workflow";
const leaders = ["admin", "principal", "director"];
const teaching = [...leaders, "teacher"];
function StaffWork({ initialTab }: { initialTab?: string }) {
  const { state, session } = useMobile();
  const [tab, setTab] = useState(
    initialTab ||
      (state.identity?.user.role === "staff" ? "Calendar" : "Timetable"),
  );
  const role = state.identity?.user.role || "";
  if (
    state.status !== "ready" ||
    state.identity?.user.passwordChangeRequired ||
    ![...teaching, "staff"].includes(role)
  )
    return <Redirect href="/" />;
  const tabs = teaching.includes(role)
    ? [
        "Timetable",
        "Calendar",
        "People",
        "Attendance",
        "Corrections",
        "Marks",
        "Reports",
        "Resources",
        "Homework reviews",
        "Notices",
        "Leave",
        ...(leaders.includes(role) ? ["Gallery", "Admissions"] : []),
      ]
    : ["Calendar", "Leave"];
  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 22,
          gap: 20,
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
          paddingBottom: 120,
        }}
      >
        <Button
          label="Back to overview"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
        <Copy large>Your school workspace</Copy>
        <Copy muted>{state.workspace?.school.name}</Copy>
        <Pick
          label="Workspace"
          selected={tab}
          options={choices(...tabs)}
          onChange={setTab}
        />
        <Button
          label="Refresh school records"
          secondary
          disabled={state.busy}
          onPress={() => void session.selectSchool(state.schoolId)}
        />
        <ErrorText message={state.error} />
        {state.busy ? (
          <Busy />
        ) : state.workspace ? (
          <WorkContent key={`${session.scope()}:${tab}`} tab={tab} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Route() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { state } = useMobile();
  const selected = featuresFor(state.identity?.user.role || "").find(
    (f) => f.screen === "work" && f.section === section,
  )?.section;
  return <StaffWork key={selected || "default"} initialTab={selected} />;
}
