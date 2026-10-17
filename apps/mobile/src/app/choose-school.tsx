import React from "react";
import { ScrollView } from "react-native";
import { Redirect } from "expo-router";
import { useMobile } from "../provider";
import { needsSchoolChoice } from "../core/session";
import { Busy, Button, Card, Copy, ErrorText } from "../components/ui";
export default function ChooseSchool() {
  const { state, session } = useMobile();
  if (!needsSchoolChoice(state)) return <Redirect href="/" />;
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 22,
        gap: 20,
        maxWidth: 620,
        width: "100%",
        alignSelf: "center",
        paddingBottom: 40,
      }}
    >
      <Copy large>Where would you like to work?</Copy>
      <Copy muted>
        Choose one of your assigned schools to open its dashboard.
      </Copy>
      <ErrorText message={state.error} />
      {state.busy ? <Busy /> : null}
      {state.identity!.schools.map((s) => (
        <Card key={s.id}>
          <Copy large>{s.name}</Copy>
          <Copy muted>{s.city || s.code || "School workspace"}</Copy>
          <Button
            label={`Open ${s.name}`}
            disabled={state.busy}
            onPress={() => void session.selectSchool(s.id)}
          />
        </Card>
      ))}
    </ScrollView>
  );
}
