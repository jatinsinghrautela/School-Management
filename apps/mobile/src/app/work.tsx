import { featuresFor } from "../core/features";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMobile } from "../provider";
import { useSchoolData } from "../daily-provider";
import { Button, Card, Copy, ErrorText, Busy, Field } from "../components/ui";
import { shareArtifact } from "../artifacts";
import type { Artifact } from "../core/daily";
import { Upload } from "../components/upload";
import {
  useAlive,
  Form,
  Pick,
  Records,
  choices,
  list,
  value,
  type Row,
} from "../components/workflow";
const leaders = ["director", "principal", "admin"];
const teaching = [...leaders, "teacher"];
const named = (rows: Row[], field = "name") =>
  rows.map((r) => ({ id: r.id, name: value(r, field) || r.id }));
const encoded = encodeURIComponent;
function Work({ tab }: { tab: string }) {
  const { state, session } = useMobile();
  const alive = useAlive();
  const w = state.workspace!;
  const user = state.identity!.user;
  const manager = leaders.includes(user.role);
  const [classId, setClassId] = useState("");
  const classes = list(w.classes),
    users = list(w.users);
  const pupils = users.filter(
    (r) =>
      r.role === "student" &&
      Array.isArray(r.classIds) &&
      r.classIds.includes(classId),
  );
  const students = named(pupils);
  const cls = {
    key: "classId",
    label: "Class and section",
    choices: named(classes),
    initial: classId,
  };
  const student = { key: "studentId", label: "Student", choices: students };
  const reason = {
    key: "reason",
    label: "Reason (5–500 characters)",
  };
  const [examId, setExamId] = useState("");
  const exam = list(w.exams).find((r) => r.id === examId);
  const specs = list(exam?.subjects).map((r) => ({
    ...r,
    id: value(r, "subjectId"),
  }));
  const subs = list(w.subjects).filter(
    (s) =>
      specs.some((p) => p.id === s.id) &&
      (manager ||
        (Array.isArray(s.teacherIds) && s.teacherIds.includes(user.id))),
  );
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const schedule = useSchoolData<{ entries: Row[]; holidays: string[] }>(
    tab === "Timetable" && selectedDate
      ? `/timetable-date?date=${encodeURIComponent(selectedDate)}`
      : null,
  );
  const admissions = useSchoolData<Record<string, Row[]>>(
    tab === "Admissions" ? "/student-records" : null,
  );
  const staff = useSchoolData<{
    people: Row[];
    requests: Row[];
    profiles: Row[];
  }>(tab === "Leave" ? "/staff-workspace" : null);
  const refresh = () => void session.selectSchool(state.schoolId);
  const post = (path: string, body: unknown) => session.school(path, body);
  if (tab === "Gallery")
    return (
      <Upload
        path="/gallery"
        title="Publish event photograph"
        fields={[
          { key: "title", label: "Event title" },
          { key: "caption", label: "Caption", optional: true },
          {
            key: "consentVerified",
            label: "Publication permission verified",
            choices: [
              { id: "true", name: "Yes, school permission is verified" },
            ],
          },
        ]}
      />
    );
  if (tab === "Admissions")
    return (
      <>
        <ErrorText message={admissions.error} />
        {admissions.loading ? <Busy /> : null}
        <Records
          rows={admissions.data?.admissions || []}
          fields={["studentName", "loginEmail", "status", "createdAt"]}
        />
      </>
    );
  if (tab === "Reports")
    return (
      <Form
        title="Share a published report"
        fields={[
          {
            key: "examId",
            label: "Published exam",
            choices: named(
              list(w.exams).filter((r) => r.status === "published"),
            ),
          },
          {
            key: "studentId",
            label: "Student",
            choices: named(users.filter((r) => r.role === "student")),
          },
        ]}
        submit={async (d) => {
          const scope = session.scope();
          const artifact = await session.school<Artifact>(
            `/reports/${encoded(d.examId)}/${encoded(d.studentId)}/pdf`,
          );
          await shareArtifact(
            artifact,
            () => alive() && session.scope() === scope,
          );
        }}
      />
    );
  if (tab === "People")
    return (
      <Records
        rows={users}
        fields={["name", "email", "role", "admissionNumber", "employeeNumber"]}
      />
    );
  if (tab === "Timetable")
    return (
      <>
        <Field label="Date YYYY-MM-DD" value={date} onChangeText={setDate} />
        <Button
          label="View dated timetable"
          disabled={!/^\d{4}-\d{2}-\d{2}$/.test(date)}
          onPress={() => setSelectedDate(date)}
        />
        <ErrorText message={schedule.error} />
        {schedule.loading ? <Busy /> : null}
        {schedule.data?.holidays.length ? (
          <Copy>Holiday: {schedule.data.holidays.join(", ")}</Copy>
        ) : null}
        <Records
          rows={
            selectedDate
              ? schedule.data?.entries || []
              : list(w.timetable).map((r) => ({
                  ...r,
                  className: classes.find((c) => c.id === r.classId)?.name,
                  subjectName: list(w.subjects).find(
                    (s) => s.id === r.subjectId,
                  )?.name,
                }))
          }
          fields={[
            "day",
            "className",
            "subjectName",
            "teacherName",
            "start",
            "end",
            "room",
          ]}
        />
        {manager ? (
          <Form
            title="Assign a cover teacher"
            fields={[
              {
                key: "entryId",
                label: "Period",
                choices: list(w.timetable).map((r) => ({
                  id: r.id,
                  name: `${classes.find((c) => c.id === r.classId)?.name} · day ${r.day} · ${r.start}`,
                })),
              },
              { key: "date", label: "Date YYYY-MM-DD" },
              {
                key: "teacherId",
                label: "Cover teacher",
                choices: named(users.filter((r) => r.role === "teacher")),
              },
              reason,
            ]}
            submit={(d) => post("/substitutions", d)}
            done={schedule.refresh}
          />
        ) : null}
      </>
    );
  if (tab === "Calendar")
    return (
      <>
        {manager ? (
          <>
            <Form
              title="Publish a calendar event"
              fields={[
                { key: "title", label: "Title" },
                { key: "description", label: "Description", optional: true },
                { key: "startDate", label: "From YYYY-MM-DD" },
                { key: "endDate", label: "Until YYYY-MM-DD" },
                {
                  key: "kind",
                  label: "Kind",
                  choices: choices("event", "holiday"),
                  initial: "event",
                },
                {
                  key: "audience",
                  label: "Audience",
                  choices: choices(
                    "all",
                    "student",
                    "teacher",
                    "parent",
                    "staff",
                  ),
                  initial: "all",
                },
                { ...cls, optional: true },
              ]}
              submit={(d) =>
                post("/calendar", { ...d, classId: d.classId || null })
              }
              done={refresh}
            />
            <Form
              title="Cancel a calendar event"
              fields={[
                {
                  key: "id",
                  label: "Active event",
                  choices: list(w.calendar)
                    .filter((r) => !r.cancelled)
                    .map((r) => ({
                      id: r.id,
                      name: `${r.title} - ${r.startDate}`,
                    })),
                },
                reason,
              ]}
              submit={(d) => post(`/calendar/${encoded(d.id)}/cancel`, d)}
              done={refresh}
            />
          </>
        ) : null}
        <Records
          rows={list(w.calendar)}
          fields={["title", "startDate", "endDate", "kind", "description"]}
        />
      </>
    );
  if (tab === "Notices")
    return (
      <>
        <Form
          title="Publish a notice"
          fields={[
            { key: "title", label: "Title" },
            { key: "body", label: "Message" },
            {
              key: "classIds",
              label: "Classes and sections",
              choices: named(classes),
              multiple: true,
              optional: manager,
            },
            {
              key: "audience",
              label: "Audience",
              choices: choices(
                ...(manager
                  ? ["all", "student", "teacher", "parent", "staff"]
                  : ["student"]),
              ),
              initial: "student",
            },
          ]}
          submit={(d) =>
            post("/notices", {
              ...d,
              classIds: d.classIds.split(",").filter(Boolean),
            })
          }
          done={refresh}
        />
        <Records
          rows={list(w.notices)}
          fields={["title", "body", "audience", "createdAt"]}
        />
      </>
    );
  if (tab === "Resources")
    return (
      <>
        <Form
          title="Publish learning material"
          fields={[
            cls,
            { key: "title", label: "Title" },
            {
              key: "type",
              label: "Type",
              choices: choices("homework", "syllabus", "timetable", "material"),
            },
            { key: "description", label: "Description" },
            { key: "url", label: "HTTPS link (optional)", optional: true },
            {
              key: "dueDate",
              label: "Due date YYYY-MM-DD (optional)",
              optional: true,
            },
          ]}
          submit={(d) => post("/resources", d)}
          done={refresh}
        />
        <Upload
          path="/uploads"
          title="Upload class material"
          fields={[
            cls,
            { key: "title", label: "Title" },
            {
              key: "type",
              label: "Type",
              choices: choices("homework", "syllabus", "timetable", "material"),
            },
            { key: "description", label: "Description", optional: true },
            {
              key: "dueDate",
              label: "Due YYYY-MM-DD (optional)",
              optional: true,
            },
          ]}
          done={refresh}
        />
        <Records
          rows={list(w.resources)}
          fields={["title", "description", "type", "dueDate"]}
        />
      </>
    );
  if (tab === "Homework reviews") {
    const rows = list(w.submissions).filter(
      (r) =>
        !list(w.submissions).some(
          (s) =>
            s.resourceId === r.resourceId &&
            s.studentId === r.studentId &&
            Number(s.version) > Number(r.version),
        ),
    );
    return (
      <>
        <Records
          rows={rows}
          fields={["studentName", "answer", "status", "submittedAt"]}
        />
        <Form
          title="Share a submitted attachment"
          fields={[
            {
              key: "id",
              label: "Submission with attachment",
              choices: rows
                .filter((r) => r.attachmentId)
                .map((r) => ({
                  id: r.id,
                  name: `${r.studentName} - ${r.attachmentName || "Attachment"}`,
                })),
            },
          ]}
          submit={async (d) => {
            const scope = session.scope();
            const artifact = await session.school<Artifact>(
              `/homework/submissions/${encoded(d.id)}/attachment-document`,
            );
            await shareArtifact(
              artifact,
              () => alive() && session.scope() === scope,
            );
          }}
        />
        <Form
          title="Review latest homework"
          fields={[
            {
              key: "id",
              label: "Submission",
              choices: rows.map((r) => ({
                id: r.id,
                name: `${r.studentName} · ${list(w.resources).find((s) => s.id === r.resourceId)?.title} · v${r.version}`,
              })),
            },
            { key: "feedback", label: "Feedback" },
            {
              key: "status",
              label: "Decision",
              choices: choices("reviewed", "revision-requested"),
            },
          ]}
          submit={(d) =>
            post(`/homework/submissions/${encoded(d.id)}/review`, d)
          }
          done={refresh}
        />
      </>
    );
  }
  if (tab === "Attendance")
    return (
      <>
        <Pick
          label="Class and section"
          options={named(classes)}
          selected={classId}
          onChange={setClassId}
        />
        {classId ? (
          <Form
            key={classId}
            title="Record attendance"
            fields={[
              student,
              { key: "date", label: "Date YYYY-MM-DD" },
              {
                key: "status",
                label: "Status",
                choices: choices("present", "absent", "late", "excused"),
              },
              {
                key: "sessionId",
                label: "Session (optional; daily if empty)",
                choices: named(
                  list(w.attendanceSessions).filter((r) => r.active),
                ),
                optional: true,
              },
            ]}
            submit={(d) =>
              post("/attendance/batch", {
                classId,
                date: d.date,
                sessionId: d.sessionId || null,
                entries: [{ studentId: d.studentId, status: d.status }],
              })
            }
            done={refresh}
          />
        ) : null}
        <Records
          rows={list(w.attendance)
            .filter((r) => !classId || r.classId === classId)
            .map((r) => ({
              ...r,
              studentName: users.find((u) => u.id === r.studentId)?.name,
            }))}
          fields={["studentName", "date", "status", "excludedFromAttendance"]}
        />
      </>
    );
  if (tab === "Marks")
    return (
      <>
        <Pick
          label="Exam"
          options={named(list(w.exams))}
          selected={examId}
          onChange={(id) => {
            setExamId(id);
            setSubjectId("");
          }}
        />
        {exam ? (
          <>
            <Copy>Exam status: {value(exam, "status")}</Copy>
            <Pick
              label="Assigned subject"
              options={named(subs)}
              selected={subjectId}
              onChange={setSubjectId}
            />
            {subjectId && exam.status === "draft" ? (
              <Form
                key={`${examId}:${subjectId}`}
                title="Enter a score"
                fields={[
                  {
                    ...student,
                    choices: named(
                      users.filter(
                        (r) =>
                          r.role === "student" &&
                          Array.isArray(r.classIds) &&
                          r.classIds.includes(exam.classId),
                      ),
                    ),
                  },
                  {
                    key: "score",
                    label: `Score (maximum ${value(specs.find((s) => s.id === subjectId) || { id: "" }, "maxScore")})`,
                    numeric: true,
                  },
                ]}
                submit={(d) =>
                  post(`/exams/${encoded(examId)}/marks/batch`, {
                    subjectId,
                    entries: [
                      { studentId: d.studentId, score: Number(d.score) },
                    ],
                  })
                }
                done={refresh}
              />
            ) : null}
            {manager ? (
              <Form
                key={`publish:${examId}`}
                title={
                  exam.status === "draft"
                    ? "Publish exam results"
                    : "Reopen exam"
                }
                fields={exam.status === "draft" ? [] : [reason]}
                submit={(d) =>
                  post(
                    `/exams/${encoded(examId)}/${exam.status === "draft" ? "publish" : "reopen"}`,
                    d,
                  )
                }
                done={refresh}
              />
            ) : null}
          </>
        ) : null}
        <Records
          rows={list(w.marks).map((r) => ({
            ...r,
            studentName: users.find((u) => u.id === r.studentId)?.name,
          }))}
          fields={["studentName", "exam", "subject", "score", "maxScore"]}
        />
      </>
    );
  if (tab === "Corrections")
    return (
      <>
        <Form
          title="Request attendance correction"
          fields={[
            {
              key: "attendanceId",
              label: "Attendance record",
              choices: list(w.attendance).map((r) => ({
                id: r.id,
                name: `${users.find((u) => u.id === r.studentId)?.name} · ${r.date} · ${r.status}`,
              })),
            },
            {
              key: "requestedStatus",
              label: "Correct status",
              choices: choices("present", "absent", "late", "excused"),
            },
            reason,
          ]}
          submit={(d) => post("/attendance-corrections", d)}
          done={refresh}
        />
        <Records
          rows={list(w.attendanceCorrections)}
          fields={["date", "requestedStatus", "reason", "status"]}
        />
        {manager ? (
          <Form
            title="Review correction"
            fields={[
              {
                key: "id",
                label: "Pending correction",
                choices: list(w.attendanceCorrections)
                  .filter((r) => r.status === "pending")
                  .map((r) => ({
                    id: r.id,
                    name: `${r.reason} · ${r.requestedStatus}`,
                  })),
              },
              {
                key: "decision",
                label: "Decision",
                choices: choices("approved", "rejected"),
              },
              reason,
            ]}
            submit={(d) =>
              post(`/attendance-corrections/${encoded(d.id)}/review`, d)
            }
            done={refresh}
          />
        ) : null}
      </>
    );
  if (tab === "Leave")
    return (
      <>
        {staff.loading ? <Busy /> : null}
        <ErrorText message={staff.error} />
        <Button
          label="Refresh leave records"
          secondary
          onPress={staff.refresh}
        />
        <Form
          title="Request leave"
          fields={[
            { key: "startDate", label: "From YYYY-MM-DD" },
            { key: "endDate", label: "Until YYYY-MM-DD" },
            {
              key: "type",
              label: "Type",
              choices: choices("personal", "sick", "annual", "other"),
            },
            reason,
          ]}
          submit={(d) =>
            post("/leave-requests", { ...d, requestKey: d.requestKey })
          }
          done={staff.refresh}
        />
        <Records
          rows={staff.data?.requests || []}
          fields={[
            "employeeName",
            "startDate",
            "endDate",
            "type",
            "reason",
            "status",
          ]}
        />
        <Form
          title="Update leave request"
          fields={[
            {
              key: "id",
              label: "Request",
              choices: (staff.data?.requests || [])
                .filter((r) =>
                  manager
                    ? r.status === "pending" || r.status === "approved"
                    : r.userId === user.id && r.status === "pending",
                )
                .map((r) => ({
                  id: r.id,
                  name: `${r.employeeName} · ${r.startDate} · ${r.status}`,
                })),
            },
            {
              key: "decision",
              label: "Decision",
              choices: choices(
                ...(manager
                  ? ["approved", "rejected", "cancelled"]
                  : ["cancelled"]),
              ),
            },
            reason,
          ]}
          submit={(d) => post(`/leave-requests/${encoded(d.id)}/decision`, d)}
          done={staff.refresh}
        />
      </>
    );
  return (
    <Card>
      <Copy>Choose a workspace above.</Copy>
    </Card>
  );
}
function StaffWork({ initialTab }: { initialTab?: string }) {
  const { state, session, colors } = useMobile();
  const [tab, setTab] = useState(
    initialTab ||
      (state.identity?.user.role === "staff" ? "Calendar" : "Timetable"),
  );
  const role = state.identity?.user.role || "";
  if (
    state.status !== "ready" ||
    state.identity?.user.passwordChangeRequired ||
    ![...teaching, "staff"].includes(role)
  )
    return <Redirect href="/" />;
  const tabs = teaching.includes(role)
    ? [
        "Timetable",
        "Calendar",
        "People",
        "Attendance",
        "Corrections",
        "Marks",
        "Reports",
        "Resources",
        "Homework reviews",
        "Notices",
        "Leave",
        ...(leaders.includes(role) ? ["Gallery", "Admissions"] : []),
      ]
    : ["Calendar", "Leave"];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 22,
          gap: 20,
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
          paddingBottom: 120,
        }}
      >
        <Button
          label="Back to overview"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
        <Copy large>Your school workspace</Copy>
        <Copy muted>{state.workspace?.school.name}</Copy>
        <Pick
          label="Workspace"
          selected={tab}
          options={choices(...tabs)}
          onChange={setTab}
        />
        <Button
          label="Refresh school records"
          secondary
          disabled={state.busy}
          onPress={() => void session.selectSchool(state.schoolId)}
        />
        <ErrorText message={state.error} />
        {state.busy ? (
          <Busy />
        ) : state.workspace ? (
          <Work key={`${session.scope()}:${tab}`} tab={tab} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Route() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { state } = useMobile();
  const selected = featuresFor(state.identity?.user.role || "").find(
    (f) => f.screen === "work" && f.section === section,
  )?.section;
  return <StaffWork key={selected || "default"} initialTab={selected} />;
}
