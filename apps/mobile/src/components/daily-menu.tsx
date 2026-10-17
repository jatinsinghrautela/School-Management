import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useFamily } from "../daily-provider";
import { useMobile } from "../provider";
import { labels, sections } from "../core/daily";
import { Busy, Button, Card, Copy, ErrorText } from "./ui";
export function ChildPicker() {
  const { state } = useMobile();
  const { family, selectChild, loading, error, refresh } = useFamily();
  if (state.identity?.user.role !== "parent") return null;
  return (
    <Card>
      <Copy>Linked children</Copy>
      {loading ? <Busy /> : null}
      <ErrorText message={error} />
      {error ? (
        <>
          <Button label="Retry family connection" onPress={refresh} />
          <Button
            label="Reset child selection"
            secondary
            onPress={() => selectChild("")}
          />
        </>
      ) : null}
      {family?.children.map((child) => (
        <Button
          key={child.id}
          label={`${family.child?.id === child.id ? "✓ " : ""}${child.name}`}
          secondary={family.child?.id !== child.id}
          onPress={() => selectChild(child.id)}
        />
      ))}
      {family && !family.children.length ? (
        <Copy muted>
          No active child links. Ask your school to review guardian access.
        </Copy>
      ) : family?.child ? (
        <Copy muted>Viewing {family.child.name}</Copy>
      ) : null}
      {family ? (
        <Button label="Refresh family records" secondary onPress={refresh} />
      ) : null}
    </Card>
  );
}
export function DailyMenu() {
  const { state, colors, dark } = useMobile();
  if (!["student", "parent"].includes(state.identity?.user.role || ""))
    return null;
  return (
    <>
      <ChildPicker />
      <Card>
        <Copy large>Your school day</Copy>
        <Copy muted>Class updates, learning and records in one place.</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {sections.map((section, index) => (
          <Pressable key={section} accessibilityRole="button" accessibilityLabel={labels[section]}
            onPress={() => router.push({ pathname: "/daily/[section]", params: { section } })}
            style={({ pressed }) => ({ flexGrow: 1, flexBasis: "44%", minWidth: 112, padding: 16, borderRadius: 23, borderWidth: 1, gap: 12, backgroundColor: dark ? "#283650" : ["#e3eaff", "#f7e7db", "#e0f0ed", "#eee5fa"][index % 4], borderColor: colors.line, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
            <View style={{ width: 44, height: 44, borderRadius: 15, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface }}>
              <Text accessibilityElementsHidden style={{ color: colors.accent, fontSize: 23 }}>{["\u2709", "\u25a4", "\u25f7", "\u25a6", "\u2713", "\u2606", "\u224b", "\u25a7"][index]}</Text>
            </View>
            <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 15, lineHeight: 22 }}>{labels[section]}</Text>
            <Text accessibilityElementsHidden style={{ color: colors.muted, fontSize: 18 }}>{"\u2197"}</Text>
          </Pressable>
        ))}
        </View>
      </Card>
    </>
  );
}
