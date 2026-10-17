import React, { useState } from "react";
import { useMobile } from "../provider";
import { useSchoolData } from "../daily-provider";
import { shareArtifact } from "../artifacts";
import type { Artifact } from "../core/daily";
import { Pick, list, value, useAlive } from "./workflow";
import { Button, Busy, Copy, ErrorText } from "./ui";
import { ReportCard, type SchoolReport } from "./report-card";
export function TeacherReports() {
  const { state, session } = useMobile();
  const alive = useAlive();
  const [examId, setExamId] = useState(""),
    [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const exams = list(state.workspace?.exams).filter(
    (e) => e.status === "published",
  );
  const exam = exams.find((e) => e.id === examId);
  const pupils = list(state.workspace?.users).filter(
    (u) =>
      u.role === "student" &&
      Array.isArray(u.classIds) &&
      u.classIds.includes(exam?.classId),
  );
  const remote = useSchoolData<SchoolReport>(
    examId && studentId
      ? `/reports/${encodeURIComponent(examId)}/${encodeURIComponent(studentId)}`
      : null,
  );
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    const scope = session.scope();
    try {
      const artifact = await session.school<Artifact>(
        `/reports/${encodeURIComponent(examId)}/${encodeURIComponent(studentId)}/pdf`,
      );
      await shareArtifact(artifact, () => alive() && scope === session.scope());
    } catch (e) {
      if (alive() && scope === session.scope())
        setError(e instanceof Error ? e.message : "Could not download report.");
    } finally {
      if (alive() && scope === session.scope()) setBusy(false);
    }
  }
  return (
    <>
      <Pick
        label="Published exam"
        disabled={busy}
        options={exams.map((e) => ({ id: e.id, name: value(e, "name") }))}
        selected={examId}
        onChange={(id) => {
          setExamId(id);
          setStudentId("");
        }}
      />
      {examId ? (
        <Pick
          label="Student"
          disabled={busy}
          options={pupils.map((p) => ({ id: p.id, name: value(p, "name") }))}
          selected={studentId}
          onChange={setStudentId}
        />
      ) : null}
      {!exams.length ? (
        <Copy muted>No published exams are available for your classes.</Copy>
      ) : null}
      {remote.loading ? <Busy label="Loading report card…" /> : null}
      <ErrorText message={remote.error || error} />
      {remote.data ? (
        <>
          <ReportCard report={remote.data} />
          <Button
            label="Download report card PDF"
            busy={busy}
            onPress={() => void download()}
          />
        </>
      ) : null}
    </>
  );
}
