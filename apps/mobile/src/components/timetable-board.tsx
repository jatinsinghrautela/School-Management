import React from "react";
import { Text, View } from "react-native";
import { useMobile } from "../provider";
import { Card, Copy } from "./ui";
type Period = {
  id: string;
  start?: unknown;
  end?: unknown;
  subjectName?: unknown;
  teacherName?: unknown;
  className?: unknown;
  room?: unknown;
};
export function TimetableBoard({ entries }: { entries: Period[] }) {
  const { colors } = useMobile();
  const ordered = [...entries].sort(
    (a, b) =>
      String(a.start || "").localeCompare(String(b.start || "")) ||
      String(a.className || "").localeCompare(String(b.className || "")),
  );
  return (
    <Card>
      <Copy large>Day schedule</Copy>
      <Copy muted>
        {ordered.length
          ? `${ordered.length} scheduled periods`
          : "No periods scheduled for this date."}
      </Copy>
      {ordered.map((p, i) => (
        <View
          key={p.id}
          style={{
            flexDirection: "row",
            gap: 12,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderColor: colors.line,
          }}
        >
          <View style={{ width: 62 }}>
            <Text
              style={{ color: colors.accent, fontWeight: "800", fontSize: 13 }}
            >
              {String(p.start || "—")}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              {String(p.end || "—")}
            </Text>
          </View>
          <View
            style={{
              width: 3,
              borderRadius: 2,
              backgroundColor: colors.accent,
              opacity: i % 2 ? 0.4 : 0.8,
            }}
          />
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{ color: colors.ink, fontSize: 15, fontWeight: "700" }}
            >
              {String(p.subjectName || "School period")}
            </Text>
            {p.className ? <Copy>{String(p.className)}</Copy> : null}
            <Copy muted>
              {[p.teacherName, p.room && `Room ${p.room}`]
                .filter(Boolean)
                .join(" · ") || "Teacher not assigned"}
            </Copy>
          </View>
        </View>
      ))}
    </Card>
  );
}
