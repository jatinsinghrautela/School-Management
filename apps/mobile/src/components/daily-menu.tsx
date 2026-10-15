import React from "react";
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
  const { state } = useMobile();
  if (!["student", "parent"].includes(state.identity?.user.role || ""))
    return null;
  return (
    <>
      <ChildPicker />
      <Card>
        <Copy large>Your school day</Copy>
        <Copy muted>Class updates, learning and records in one place.</Copy>
        {sections.map((section) => (
          <Button
            key={section}
            label={labels[section]}
            secondary
            onPress={() =>
              router.push({ pathname: "/daily/[section]", params: { section } })
            }
          />
        ))}
      </Card>
    </>
  );
}
