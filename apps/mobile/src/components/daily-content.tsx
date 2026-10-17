import { Pick } from "./workflow";
import { ReportCard, type SchoolReport } from "./report-card";
import { MonthCalendar } from "./month-calendar";
import { sentenceLabel } from "../core/text";
import { DateField } from "./date-field";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Linking } from "react-native";
import { useMobile } from "../provider";
import { useFamily, useSchoolData } from "../daily-provider";
import {
  type Artifact,
  attendanceSummary,
  type Entry,
  money,
  rows,
  type Section,
  webUrl,
} from "../core/daily";
import { shareArtifact } from "../artifacts";
import { Busy, Button, Card, Copy, ErrorText, Field } from "../components/ui";
import { HomeworkAnswer } from "../components/homework-answer";
function List({
  entries,
  render,
}: {
  entries: Entry[];
  render: (entry: Entry) => React.ReactNode;
}) {
  const [limit, setLimit] = useState(20);
  return (
    <>
      {entries.length ? (
        entries
          .slice(0, limit)
          .map((e) => <React.Fragment key={e.id}>{render(e)}</React.Fragment>)
      ) : (
        <Card>
          <Copy muted>No records to show.</Copy>
        </Card>
      )}
      {entries.length > limit ? (
        <Button
          secondary
          label="Show more records"
          onPress={() => setLimit((n) => n + 20)}
        />
      ) : null}
    </>
  );
}
function useAction() {
  const { session } = useMobile();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    if (!mounted.current) return;
    const scope = session.scope();
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (mounted.current && scope === session.scope())
        setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      if (mounted.current && scope === session.scope()) setBusy(false);
    }
  }
  return { busy, error, run, isMounted: () => mounted.current };
}
function useDocument() {
  const { session } = useMobile();
  const action = useAction();
  return {
    ...action,
    download: (path: string) =>
      action.run(async () => {
        const scope = session.scope();
        const artifact = await session.school<Artifact>(path);
        await shareArtifact(
          artifact,
          () => action.isMounted() && scope === session.scope(),
        );
      }),
  };
}
function Notices() {
  const { state, session } = useMobile();
  const { family } = useFamily();
  const inbox = useSchoolData<{ items: Entry[] }>("/inbox");
  const action = useAction();
  const [search, setSearch] = useState("");
  const notices =
    state.identity?.user.role === "parent"
      ? family?.child?.notices || []
      : rows(state.workspace?.notices);
  return (
    <>
      <Field label="Search notices" value={search} onChangeText={setSearch} />
      <ErrorText message={action.error || inbox.error} />
      <List
        entries={notices.filter((n) =>
          `${n.title} ${n.body}`.toLowerCase().includes(search.toLowerCase()),
        )}
        render={(n) => {
          const receipt = inbox.data?.items.find(
            (i) => i.id === `notice:${n.id}`,
          );
          return (
            <Card>
              <Copy large>{n.title}</Copy>
              <Copy muted>{n.createdAt?.slice(0, 10)}</Copy>
              <Copy>{n.body}</Copy>
              {receipt ? (
                <Button
                  label={receipt.readAt ? "Read" : "Mark as read"}
                  secondary
                  busy={action.busy}
                  disabled={!!receipt.readAt || action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await session.school("/inbox/read", { id: receipt.id });
                      inbox.refresh();
                    })
                  }
                />
              ) : null}
            </Card>
          );
        }}
      />
    </>
  );
}
function Learning() {
  const { state } = useMobile();
  const { family } = useFamily();
  const doc = useDocument();
  const parent = state.identity?.user.role === "parent";
  const resources = parent
    ? family?.child?.resources || []
    : rows(state.workspace?.resources);
  return (
    <>
      <ErrorText message={doc.error} />
      <List
        entries={resources}
        render={(r) => (
          <Card>
            <Copy large>{r.title}</Copy>
            <Copy muted>
              {sentenceLabel(r.type || "")}
              {r.dueDate ? ` · Due ${r.dueDate}` : ""}
            </Copy>
            <Copy>{r.description}</Copy>
            {r.url ? (
              <Button
                label={`Open link: ${r.title}`}
                secondary
                onPress={() =>
                  Alert.alert("Open resource link?", r.url, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Open",
                      onPress: () =>
                        void doc.run(async () => {
                          await Linking.openURL(webUrl(r.url!));
                        }),
                    },
                  ])
                }
              />
            ) : null}
            {r.fileId || r.hasAttachment ? (
              <Button
                label="Share class attachment"
                busy={doc.busy}
                disabled={doc.busy}
                onPress={() =>
                  void doc.download(
                    parent
                      ? `/family/resources/${encodeURIComponent(r.id)}/download`
                      : `/resources/${encodeURIComponent(r.id)}/document`,
                  )
                }
              />
            ) : null}
            {state.identity?.user.role === "student" &&
            r.type === "homework" ? (
              <HomeworkAnswer resourceId={r.id} />
            ) : null}
            {!parent
              ? rows(state.workspace?.submissions)
                  .filter((s) => s.resourceId === r.id)
                  .sort((a, b) => (b.version || 0) - (a.version || 0))
                  .slice(0, 1)
                  .map((s) => (
                    <React.Fragment key={s.id}>
                      {s.attachmentId &&
                      state.identity?.user.role === "student" ? (
                        <Button
                          label="Share my submitted attachment"
                          busy={doc.busy}
                          disabled={doc.busy}
                          secondary
                          onPress={() =>
                            void doc.download(
                              `/homework/submissions/${encodeURIComponent(s.id)}/attachment-document`,
                            )
                          }
                        />
                      ) : null}
                      <Copy>
                        Latest submission: {sentenceLabel(s.status || "")}
                        {s.reviews
                          ?.map((v) => ` · ${v.feedback || ""}`)
                          .join("")}
                      </Copy>
                    </React.Fragment>
                  ))
              : null}
          </Card>
        )}
      />
    </>
  );
}
function Attendance() {
  const { state } = useMobile();
  const { family } = useFamily();
  const entries =
    state.identity?.user.role === "parent"
      ? family?.child?.attendance || []
      : rows(state.workspace?.attendance);
  const summary = attendanceSummary(entries);
  return (
    <>
      <Card>
        <Copy large>
          {summary.present} / {summary.total}
        </Copy>
        <Copy muted>
          Present or late / recorded sessions. {summary.excluded} holiday
          sessions excluded. Unrecorded dates are not counted as absences.
        </Copy>
      </Card>
      <List
        entries={[...entries].sort((a, b) =>
          (b.date || "").localeCompare(a.date || ""),
        )}
        render={(r) => (
          <Card>
            <Copy>
              {r.date} · {r.sessionName || "Daily"}
            </Copy>
            <Copy muted>
              {r.excludedFromAttendance
                ? "Holiday — excluded"
                : sentenceLabel(r.status || "")}
            </Copy>
          </Card>
        )}
      />
    </>
  );
}
function Calendar() {
  const { state } = useMobile();
  const { family } = useFamily();
  const entries =
    state.identity?.user.role === "parent"
      ? family?.child?.calendar || []
      : rows(state.workspace?.calendar);
  return <MonthCalendar entries={entries} />;
}
function Timetable() {
  const { state } = useMobile();
  const { family } = useFamily();
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [draft, setDraft] = useState(localDate),
    [date, setDate] = useState(localDate);
  const parent = state.identity?.user.role === "parent";
  const childId = family?.child?.id;
  const data = useSchoolData<{
    date: string;
    holidays: string[];
    entries: Entry[];
  }>(
    parent
      ? childId
        ? `/family/timetable?childId=${encodeURIComponent(childId)}&date=${date}`
        : null
      : `/timetable-date?date=${date}`,
  );
  return (
    <>
      <DateField label="Timetable date" value={draft} onChange={setDraft} />
      <Button
        label="View date"
        disabled={!/^\d{4}-\d{2}-\d{2}$/.test(draft)}
        onPress={() => setDate(draft)}
      />
      {data.loading ? <Busy /> : null}
      <ErrorText message={data.error} />
      {data.error ? (
        <Button label="Retry timetable" onPress={data.refresh} />
      ) : null}
      {data.data?.holidays.length ? (
        <Card>
          <Copy>School holiday</Copy>
          <Copy muted>{data.data.holidays.join(", ")}</Copy>
        </Card>
      ) : null}
      <List
        entries={[...(data.data?.entries || [])].sort((a, b) =>
          (a.start || "").localeCompare(b.start || ""),
        )}
        render={(e) => (
          <Card>
            <Copy large>{e.subjectName}</Copy>
            <Copy>
              {e.start} – {e.end}
            </Copy>
            <Copy muted>
              {e.teacherName}
              {e.room ? ` · ${e.room}` : ""}
            </Copy>
          </Card>
        )}
      />
    </>
  );
}
function Results() {
  const { state } = useMobile();
  const { family } = useFamily();
  const parent = state.identity?.user.role === "parent";
  const [exam, setExam] = useState(
    () =>
      rows(state.workspace?.exams).find((e) => e.status === "published")?.id ||
      "",
  );
  const remote = useSchoolData<SchoolReport>(
    !parent && exam
      ? `/reports/${encodeURIComponent(exam)}/${encodeURIComponent(state.identity!.user.id)}`
      : null,
  );
  const doc = useDocument();
  const reports = parent
    ? family?.child?.reports || []
    : rows(state.workspace?.exams).filter((e) => e.status === "published");
  return (
    <>
      <ErrorText message={remote.error || doc.error} />
      {remote.loading ? <Busy /> : null}
      {parent ? (
        reports.map((r) => (
          <React.Fragment key={r.id}>
            <ReportCard report={r} />
            <Button
              label={`Download report: ${r.examName || "Report card"}`}
              busy={doc.busy}
              secondary
              onPress={() =>
                void doc.download(`/family/reports/${encodeURIComponent(r.id)}`)
              }
            />
          </React.Fragment>
        ))
      ) : (
        <>
          <Pick
            label="Published exam"
            options={reports.map((r) => ({
              id: r.id,
              name: r.name || "Published exam",
            }))}
            selected={exam}
            onChange={setExam}
            disabled={doc.busy}
          />
          {remote.data ? (
            <>
              <ReportCard report={remote.data} />
              <Button
                label="Download report card PDF"
                busy={doc.busy}
                onPress={() =>
                  void doc.download(
                    `/reports/${encodeURIComponent(exam)}/${encodeURIComponent(state.identity!.user.id)}/pdf`,
                  )
                }
              />
            </>
          ) : null}
        </>
      )}
      {!reports.length ? (
        <Copy muted>No published results are available.</Copy>
      ) : null}
    </>
  );
}
function Fees() {
  const { state } = useMobile();
  const { family } = useFamily();
  const parent = state.identity?.user.role === "parent";
  const remote = useSchoolData<{ charges: Entry[]; payments: Entry[] }>(
    parent ? null : "/fees",
  );
  const doc = useDocument();
  const charges = parent
      ? family?.child?.fees || []
      : remote.data?.charges || [],
    payments = parent
      ? family?.child?.payments || []
      : remote.data?.payments || [];
  return (
    <>
      {remote.loading ? <Busy /> : null}
      <ErrorText message={remote.error || doc.error} />
      {remote.error ? (
        <Button label="Retry fees" onPress={remote.refresh} />
      ) : null}
      <Copy muted>
        Balances are maintained by your school. This app does not take payments
        or verify bank settlement.
      </Copy>
      <List
        entries={charges}
        render={(c) => (
          <Card>
            <Copy large>{c.name}</Copy>
            <Copy>Outstanding: {money(c.outstandingMinor, c.currency)}</Copy>
            <Copy muted>
              Charged {money(c.amountMinor, c.currency)} · Paid{" "}
              {money(c.paidMinor, c.currency)} · Concession{" "}
              {money(c.concessionMinor, c.currency)}
            </Copy>
            <Copy muted>Due {c.dueDate}</Copy>
          </Card>
        )}
      />
      <Copy large>Payment history</Copy>
      <List
        entries={payments}
        render={(p) => (
          <Card>
            <Copy>{p.receiptNumber}</Copy>
            <Copy>
              {money(p.amountMinor, p.currency)} · {p.paidOn}
            </Copy>
            <Copy muted>{p.voided ? "VOIDED" : p.method}</Copy>
            <Button
              secondary
              label="Share receipt"
              busy={doc.busy}
              disabled={doc.busy}
              onPress={() =>
                void doc.download(
                  `${parent ? "/family" : ""}/fee-payments/${encodeURIComponent(p.id)}/receipt`,
                )
              }
            />
          </Card>
        )}
      />
    </>
  );
}
function Photo({ photo }: { photo: Entry }) {
  const [opened, setOpened] = useState(false);
  const image = useSchoolData<{ dataUri: string }>(
    opened ? `/gallery/${encodeURIComponent(photo.id)}/image` : null,
  );
  return (
    <Card>
      <Copy>{photo.title}</Copy>
      <Copy muted>{photo.caption}</Copy>
      {image.loading ? <Busy /> : null}
      <ErrorText message={image.error} />
      {image.data ? (
        <Image
          source={{ uri: image.data.dataUri }}
          accessibilityLabel={photo.title || "School event photo"}
          style={{ width: "100%", height: 220, borderRadius: 16 }}
          resizeMode="contain"
        />
      ) : null}
      <Button
        secondary
        label={opened ? "Hide photo" : `View photo: ${photo.title}`}
        onPress={() => setOpened(!opened)}
      />
    </Card>
  );
}
function Gallery() {
  const [page, setPage] = useState(1);
  const data = useSchoolData<{ photos: Entry[]; total: number }>(
    `/gallery?page=${page}`,
  );
  return (
    <>
      {data.loading ? <Busy /> : null}
      <ErrorText message={data.error} />
      {data.error ? (
        <Button label="Retry gallery" onPress={data.refresh} />
      ) : null}
      <List
        entries={data.data?.photos || []}
        render={(p) => <Photo photo={p} />}
      />
      <Copy muted>
        Page {page} · {data.data?.total ?? 0} photos. Photos load only when
        opened.
      </Copy>
      <Button
        label="Previous photos"
        secondary
        disabled={page === 1}
        onPress={() => setPage((p) => p - 1)}
      />
      <Button
        label="Next photos"
        secondary
        disabled={!data.data || page * 12 >= data.data.total}
        onPress={() => setPage((p) => p + 1)}
      />
    </>
  );
}
export function DailyContent({ section }: { section: Section }) {
  switch (section) {
    case "notices":
      return <Notices />;
    case "learning":
      return <Learning />;
    case "timetable":
      return <Timetable />;
    case "calendar":
      return <Calendar />;
    case "attendance":
      return <Attendance />;
    case "results":
      return <Results />;
    case "fees":
      return <Fees />;
    case "gallery":
      return <Gallery />;
  }
}
