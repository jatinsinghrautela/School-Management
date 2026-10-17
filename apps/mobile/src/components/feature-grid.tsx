import React from "react";
import { Pressable, Text, View } from "react-native";
import { useMobile } from "../provider";
import type { Feature } from "../core/features";
import { useFeatureNavigation } from "./feature-navigation";
export function FeatureGrid({
  features,
  prefix = "",
}: {
  features: Feature[];
  prefix?: string;
}) {
  const { colors, dark } = useMobile();
  const open = useFeatureNavigation();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {features.map((f, index) => (
        <Pressable
          key={f.label}
          accessibilityRole="button"
          accessibilityLabel={`${prefix}${f.label}`}
          onPress={() => open(f)}
          style={({ pressed }) => ({
            flexBasis: "21%",
            flexGrow: 1,
            minWidth: 62,
            alignItems: "center",
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 2,
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 17,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: dark
                ? "#25423e"
                : ["#d9ede6", "#f3e7d9", "#e6e5f3", "#dceef0"][index % 4],
            }}
          >
            <Text style={{ color: colors.accent, fontSize: 24 }}>{f.icon}</Text>
          </View>
          <Text
            style={{
              textAlign: "center",
              color: colors.ink,
              fontSize: 11,
              fontWeight: "600",
              lineHeight: 16,
            }}
          >
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
