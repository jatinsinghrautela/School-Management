import React from "react";
import { RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobile } from "../../provider";
import { Dashboard } from "../../components/dashboard";
export default function Home() {
  const { state, session, colors } = useMobile();
  if (state.status !== "ready") return null;
  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 18,
          paddingBottom: 120,
          gap: 18,
          maxWidth: 620,
          width: "100%",
          alignSelf: "center",
        }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            tintColor={colors.accent}
            onRefresh={() => void session.restore()}
          />
        }
      >
        <Dashboard />
      </ScrollView>
    </SafeAreaView>
  );
}
