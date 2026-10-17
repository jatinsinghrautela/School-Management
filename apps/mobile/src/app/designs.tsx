import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMobile, type Design } from "../provider";
import { Button, Card, Copy } from "../components/ui";
import { Hero } from "../components/hero";
export default function Designs() {
  const { colors, design, setDesign, toggle, dark } = useMobile();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: 22,
          gap: 20,
          width: "100%",
          maxWidth: 620,
          alignSelf: "center",
          paddingBottom: 40,
        }}
      >
        <Button
          label="Back to app"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
        <Copy large>One identity. Three expressions.</Copy>
        <Copy muted>
          Preview with sample content. Your choice applies across this app
          session.
        </Copy>
        {(["glass", "clay", "maximalism"] as Design[]).map((item) => (
          <Button
            key={item}
            label={`${design === item ? "Selected: " : "Preview "}${item}`}
            secondary={design !== item}
            onPress={() => setDesign(item)}
          />
        ))}
        <Button
          label={dark ? "Switch to light mode" : "Switch to dark mode"}
          secondary
          onPress={toggle}
        />
        <Hero
          title="Great days start with a clear view."
          detail="Your people, progress and plans. Together in one school workspace."
        />
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Card>
              <Copy large>6</Copy>
              <Copy muted>Classes today</Copy>
            </Card>
          </View>
          <View style={{ flex: 1 }}>
            <Card>
              <Copy large>3</Copy>
              <Copy muted>New notices</Copy>
            </Card>
          </View>
        </View>
        <Card>
          <Copy large>Your school day</Copy>
          <Copy muted>
            {design === "glass"
              ? "Light, translucent surfaces and fine borders."
              : design === "clay"
                ? "Rounded, tactile cards with soft raised shadows."
                : "Bold borders, graphic blocks and confident typography."}
          </Copy>
          <Button label="Explore learning" onPress={() => {}} />
        </Card>
        <Copy muted>Powered by Schoolglass Desk</Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
