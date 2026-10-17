import React from "react";
import { Image, Text, View } from "react-native";
import { useMobile } from "../provider";
import type { Entry } from "../core/daily";
import { BrandMark } from "./hero";
import { Card, Copy } from "./ui";
export type SchoolReport = Entry & {
  schoolName?: string;
  schoolLogo?: string;
  schoolCity?: string;
  studentName?: string;
  className?: string;
  academicYear?: string;
  totalScore?: number;
  totalMax?: number;
  passed?: boolean;
  publishedAt?: string;
  publishedBy?: string;
  reportStyle?: { heading?: string; principal?: string; classTeacher?: string };
};
export function ReportCard({ report }: { report: SchoolReport }) {
  const { colors } = useMobile();
  const style = report.reportStyle || {};
  return (
    <Card>
      <View style={{ alignItems: "center", gap: 7 }}>
        {report.schoolLogo ? (
          <Image
            accessibilityLabel="Published school logo"
            source={{ uri: report.schoolLogo }}
            style={{ width: 60, height: 60, resizeMode: "contain" }}
          />
        ) : (
          <View
            style={{
              padding: 8,
              borderRadius: 15,
              backgroundColor: colors.hero,
            }}
          >
            <BrandMark />
          </View>
        )}
        <Copy large>{report.schoolName || "School report"}</Copy>
        {report.schoolCity ? <Copy muted>{report.schoolCity}</Copy> : null}
        <Copy>{style.heading || "Academic report card"}</Copy>
        <Copy>{report.examName}</Copy>
      </View>
      <Copy>
        {report.studentName} · {report.className}
      </Copy>
      {report.academicYear ? (
        <Copy muted>Academic year: {report.academicYear}</Copy>
      ) : null}
      <View
        accessibilityLabel="Subject marks table"
        style={{
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.accent,
            padding: 10,
            gap: 8,
          }}
        >
          {["Subject", "Marks", "Result"].map((t, i) => (
            <Text
              key={t}
              style={{
                flex: i ? 1 : 1.6,
                color: colors.onAccent,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {t}
            </Text>
          ))}
        </View>
        {(report.rows || []).map((r, i) => (
          <View
            key={`${r.name}-${i}`}
            accessibilityLabel={`${r.name}: ${r.score} out of ${r.maxScore}${r.passed === undefined ? "" : r.passed ? ", Pass" : ", Needs support"}`}
            style={{
              flexDirection: "row",
              padding: 10,
              gap: 8,
              borderTopWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Text style={{ flex: 1.6, color: colors.ink, fontSize: 13 }}>
              {r.name}
            </Text>
            <Text style={{ flex: 1, color: colors.ink, fontSize: 13 }}>
              {r.score} / {r.maxScore}
            </Text>
            <Text style={{ flex: 1, color: colors.ink, fontSize: 12 }}>
              {r.passed === undefined
                ? "—"
                : r.passed
                  ? "Pass"
                  : "Needs support"}
            </Text>
          </View>
        ))}
      </View>
      {report.totalScore !== undefined ? (
        <Copy>
          Total: {report.totalScore} / {report.totalMax}
        </Copy>
      ) : null}
      <Copy>
        {typeof report.percentage === "number"
          ? `${report.percentage.toFixed(2)}% · `
          : ""}
        Grade: {report.grade || "—"}
      </Copy>
      <Copy muted>
        Published version {report.version}
        {report.publishedAt ? ` · ${report.publishedAt.slice(0, 10)}` : ""}
      </Copy>
      <View style={{ flexDirection: "row", gap: 16, paddingTop: 14 }}>
        {[
          { label: "Class teacher", name: style.classTeacher },
          { label: "Principal", name: style.principal || report.publishedBy },
        ].map((s) => (
          <View
            key={s.label}
            style={{
              flex: 1,
              gap: 8,
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingTop: 8,
            }}
          >
            <Copy>{s.name || "Not configured"}</Copy>
            <Copy muted>{s.label}</Copy>
          </View>
        ))}
      </View>
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
        School-configured sign-off names. The PDF includes the approved school
        branding and signature lines; printed names are not verified digital
        signatures.
      </Text>
    </Card>
  );
}
