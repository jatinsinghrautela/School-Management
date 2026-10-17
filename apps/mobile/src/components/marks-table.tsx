import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useMobile } from "../provider";
import { Card, Copy } from "./ui";
import type { Row } from "./workflow";
/** One selected exam and subject, with compact rows instead of repeated record cards. */
export function MarksTable({
  students,
  marks,
  maximum,
}: {
  students: Row[];
  marks: Row[];
  maximum: string;
}) {
  const { colors } = useMobile();
  const [search, setSearch] = useState("");
  const marked = new Map(marks.map((m) => [m.studentId, m]));
  const visible = students
    .filter((s) =>
      String(s.name || "")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return (
    <Card>
      <Copy large>Class marks register</Copy>
      <Copy muted>
        {students.filter((s) => marked.has(s.id)).length} of {students.length}{" "}
        students marked · Maximum {maximum}
      </Copy>
      <TextInput
        accessibilityLabel="Search students in marks register"
        placeholder="Search student name"
        placeholderTextColor={colors.muted}
        value={search}
        onChangeText={setSearch}
        style={{
          color: colors.ink,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          minHeight: 44,
        }}
      />
      <View style={{ flexDirection: "row", paddingVertical: 8 }}>
        <Text style={{ flex: 1, color: colors.muted, fontWeight: "700" }}>
          Student
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontWeight: "700",
            width: 90,
            textAlign: "right",
          }}
        >
          Score / Max
        </Text>
      </View>
      {visible.map((s) => (
        <View
          key={s.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Text style={{ flex: 1, color: colors.ink }}>
            {String(s.name || s.id)}
          </Text>
          <Text
            style={{
              color: marked.has(s.id) ? colors.accent : colors.muted,
              width: 90,
              textAlign: "right",
              fontWeight: "700",
            }}
          >
            {marked.has(s.id)
              ? `${marked.get(s.id)!.score} / ${maximum}`
              : "Not marked"}
          </Text>
        </View>
      ))}
      {!visible.length ? <Copy muted>No matching students.</Copy> : null}
    </Card>
  );
}
