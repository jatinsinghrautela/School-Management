import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMobile } from "../../provider";
import { useFamily, useSchoolData } from "../../daily-provider";
import {
  type Artifact,
  attendanceSummary,
  type Entry,
  labels,
  money,
  rows,
  sections,
  type Section,
  webUrl,
} from "../../core/daily";
import { shareArtifact } from "../../artifacts";
import {
  Busy,
  Button,
  Card,
  Copy,
  ErrorText,
  Field,
} from "../../components/ui";
import { ChildPicker } from "../../components/daily-menu";
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
        setError(e instanceof Error ? e.message : "Please retry");
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
              {r.type}
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
            {!parent
              ? rows(state.workspace?.submissions)
                  .filter((s) => s.resourceId === r.id)
                  .sort((a, b) => (b.version || 0) - (a.version || 0))
                  .slice(0, 1)
                  .map((s) => (
                    <Copy key={s.id}>
                      Latest submission: {s.status}
                      {s.reviews?.map((v) => ` · ${v.feedback || ""}`).join("")}
                    </Copy>
                  ))
              : null}
          </Card>
        )}
      />
      <Copy muted>
        Homework is read-only in this milestone. Use the website to submit
        answers or attachments.
      </Copy>
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
              {r.excludedFromAttendance ? "Holiday — excluded" : r.status}
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
  return (
    <List
      entries={[...entries].sort((a, b) =>
        (a.startDate || "").localeCompare(b.startDate || ""),
      )}
      render={(e) => (
        <Card>
          <Copy large>{e.title}</Copy>
          <Copy muted>
            {e.startDate}
            {e.endDate !== e.startDate ? ` – ${e.endDate}` : ""}
          </Copy>
          <Copy>{e.description}</Copy>
        </Card>
      )}
    />
  );
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
      <Field
        label="Timetable date (YYYY-MM-DD)"
        value={draft}
        onChangeText={setDraft}
      />
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
function Report({ report }: { report: Entry }) {
  return (
    <Card>
      <Copy large>{report.examName}</Copy>
      <Copy>
        {report.grade} ·{" "}
        {typeof report.percentage === "number"
          ? `${report.percentage.toFixed(2)}%`
          : ""}
      </Copy>
      <Copy muted>Published version {report.version}</Copy>
      {report.rows?.map((r, i) => (
        <Copy key={i}>
          {r.name}: {r.score} / {r.maxScore}
        </Copy>
      ))}
    </Card>
  );
}
function Results() {
  const { state } = useMobile();
  const { family } = useFamily();
  const parent = state.identity?.user.role === "parent";
  const [exam, setExam] = useState("");
  const remote = useSchoolData<Entry>(
    !parent && exam
      ? `/reports/${encodeURIComponent(exam)}/${encodeURIComponent(state.identity!.user.id)}`
      : null,
  );
  const doc = useDocument();
  const reports = parent
    ? family?.child?.reports || []
    : rows(state.workspace?.exams);
  return (
    <>
      <ErrorText message={remote.error || doc.error} />
      {remote.loading ? <Busy /> : null}
      <List
        entries={reports}
        render={(r) => (
          <Card>
            <Copy large>{r.examName || r.name}</Copy>
            {parent ? (
              <Report report={r} />
            ) : (
              <Button
                secondary
                label={`View result: ${r.name}`}
                onPress={() => setExam(r.id)}
              />
            )}
            <Button
              label="Share published report"
              disabled={doc.busy}
              secondary
              onPress={() =>
                void doc.download(
                  parent
                    ? `/family/reports/${encodeURIComponent(r.id)}`
                    : `/reports/${encodeURIComponent(r.id)}/${encodeURIComponent(state.identity!.user.id)}/pdf`,
                )
              }
            />
          </Card>
        )}
      />
      {remote.data ? <Report report={remote.data} /> : null}
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
function Content({ section }: { section: Section }) {
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
export default function Daily() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { session, state, colors } = useMobile();
  const family = useFamily();
  if (
    !sections.includes(section as Section) ||
    !["student", "parent"].includes(state.identity?.user.role || "")
  )
    return <Redirect href="/" />;
  const parent = state.identity?.user.role === "parent";
  const scope = `${session.scope()}:${family.childId}:${section}`;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 22,
          gap: 20,
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          paddingBottom: 40,
        }}
      >
        <Button
          label="Back to overview"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
        <Copy muted>{state.workspace?.school.name}</Copy>
        <Copy large>{labels[section as Section]}</Copy>
        {!parent ? (
          <Button
            label="Refresh school records"
            secondary
            disabled={state.busy}
            onPress={() => void session.selectSchool(state.schoolId)}
          />
        ) : null}
        {state.busy ? <Busy /> : null}
        {parent ? <ChildPicker /> : null}
        {state.busy ||
        (parent && (family.loading || !family.family?.child)) ? null : (
          <Content key={scope} section={section as Section} />
        )}
        <Copy muted>Powered by Schoolglass Desk</Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
