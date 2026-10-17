import React from "react";
import { ScrollView } from "react-native";
import { useMobile } from "../provider";
import { featuresFor } from "../core/features";
import { FeatureGrid } from "../components/feature-grid";
import { Card, Copy } from "../components/ui";
export default function SchoolDay() {
  const { state } = useMobile();
  const features = featuresFor(state.identity?.user.role || "").filter(
    (f) => f.screen === "daily" || f.screen === "work",
  );
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        gap: 20,
        paddingBottom: 120,
        maxWidth: 680,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Copy large>Your school day</Copy>
      <Copy muted>Daily learning, teaching and campus tasks.</Copy>
      {features.length ? (
        <Card>
          <FeatureGrid features={features} />
        </Card>
      ) : (
        <Copy muted>
          Platform management tools are available from Services on the website.
        </Copy>
      )}
    </ScrollView>
  );
}
