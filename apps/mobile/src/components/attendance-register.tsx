import { sentenceLabel } from "../core/text";
import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMobile } from "../provider";
import { localDate } from "../core/dates";
import { attendanceRoster, attendanceStatuses } from "../core/attendance";
import { DateField } from "./date-field";
import { Button, Card, Copy, ErrorText, Busy } from "./ui";
import { SavedMotion } from "./feedback";
import { list, Pick, useAlive } from "./workflow";
export function AttendanceRegister({ classId }: { classId: string }) {
  const { state } = useMobile();
  const [sending, setSending] = useState(false);
  const [date, setDate] = useState(localDate),
    [sessionId, setSessionId] = useState("");
  const sessions = list(state.workspace?.attendanceSessions).filter(
    (s) => s.active,
  );
  return (
    <>
      <Card>
        <Copy large>Class attendance</Copy>
        <DateField
          label="Attendance date"
          value={date}
          onChange={setDate}
          disabled={sending}
        />
        <Pick
          label="Attendance session"
          disabled={sending}
          options={[
            { id: "daily", name: "Daily" },
            ...sessions.map((s) => ({
              id: s.id,
              name: String(s.name || s.id),
            })),
          ]}
          selected={sessionId || "daily"}
          onChange={(v) => {
            if (!sending) setSessionId(v === "daily" ? "" : v);
          }}
        />
        <Copy muted>
          Choose a date and session before marking. Changing either resets
          unsaved selections. Saved records use Attendance corrections.
        </Copy>
      </Card>
      <AttendanceSheet
        key={`${date}:${sessionId}`}
        classId={classId}
        date={date}
        sessionId={sessionId}
        onBusy={setSending}
      />
    </>
  );
}
function AttendanceSheet({
  classId,
  date,
  sessionId,
  onBusy,
}: {
  classId: string;
  date: string;
  sessionId: string;
  onBusy: (busy: boolean) => void;
}) {
  const { state, session, colors } = useMobile();
  const alive = useAlive();
  const roster = attendanceRoster(
    list(state.workspace?.users),
    list(state.workspace?.attendance),
    classId,
    date,
    sessionId,
  );
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(roster.map((r) => [r.id, r.status])),
  );
  const [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const pending = roster.filter((r) => !r.locked);
  const unmarked = pending.filter((r) => !statuses[r.id]).length;
  const canSave = pending.length > 0 && roster.length <= 200 && unmarked === 0;
  async function save() {
    if (lock.current || !canSave) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    const scope = session.scope();
    try {
      await session.school("/attendance/batch", {
        classId,
        date,
        sessionId: sessionId || null,
        entries: pending.map((r) => ({
          studentId: r.id,
          status: statuses[r.id],
        })),
      });
      if (alive() && scope === session.scope()) setSaved(true);
    } catch (e) {
      if (alive() && scope === session.scope())
        setError(
          `${e instanceof Error ? e.message : "Could not save attendance."} Refresh school records before retrying if the response was interrupted.`,
        );
    } finally {
      lock.current = false;
      if (alive() && scope === session.scope()) {
        setBusy(false);
        onBusy(false);
      }
    }
  }
  if (saved)
    return (
      <Card>
        <SavedMotion>
          <Copy>
            Class attendance saved for {date}: {pending.length}{" "}
            {pending.length === 1 ? "student" : "students"}.
          </Copy>
        </SavedMotion>
        <Copy muted>
          Refresh school records to see the saved register. Previously recorded
          attendance was preserved.
        </Copy>
      </Card>
    );
  return (
    <>
      <Card>
        <Copy large>
          {review ? "Review class attendance" : "Mark class attendance"}
        </Copy>
        <Copy>
          {roster.length} {roster.length === 1 ? "student" : "students"} ·{" "}
          {unmarked} unmarked · {roster.length - pending.length} already
          recorded
        </Copy>
        <Copy muted>
          {attendanceStatuses
            .map(
              (s) =>
                `${sentenceLabel(s)}: ${roster.filter((r) => statuses[r.id] === s).length}`,
            )
            .join(" · ")}
        </Copy>
        {!review ? (
          <Button
            label="Mark remaining present"
            secondary
            disabled={busy || !unmarked}
            onPress={() =>
              setStatuses((old) => ({
                ...old,
                ...Object.fromEntries(
                  pending
                    .filter((r) => !old[r.id])
                    .map((r) => [r.id, "present"]),
                ),
              }))
            }
          />
        ) : (
          <Copy>
            {date} ·{" "}
            {sessionId
              ? (list(state.workspace?.attendanceSessions).find(
                  (s) => s.id === sessionId,
                )?.name as string)
              : "Daily"}
            . Submitting {pending.length} new records in one request.
          </Copy>
        )}
        {roster.length > 200 ? (
          <ErrorText message="This register supports up to 200 students per class. Contact your administrator to review class grouping before submitting." />
        ) : null}
        {!roster.length ? (
          <Copy muted>No students are enrolled in this class.</Copy>
        ) : null}
        {!pending.length && roster.length ? (
          <Copy muted>
            All students are already recorded. Use Attendance corrections for
            changes.
          </Copy>
        ) : null}
      </Card>
      {roster.map((r) => (
        <Card key={r.id}>
          <Copy>{r.name}</Copy>
          {r.locked || review ? (
            <Copy>
              {sentenceLabel(statuses[r.id] || "Unmarked")}
              {r.locked ? " · Already recorded" : ""}
            </Copy>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {attendanceStatuses.map((status) => (
                <Pressable
                  key={sentenceLabel(status)}
                  accessibilityRole="radio"
                  accessibilityLabel={`${sentenceLabel(status)} for ${r.name}`}
                  accessibilityState={{
                    selected: statuses[r.id] === status,
                    disabled: busy,
                  }}
                  disabled={busy}
                  onPress={() =>
                    setStatuses((old) => ({ ...old, [r.id]: status }))
                  }
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor:
                      statuses[r.id] === status
                        ? colors.accent
                        : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      color:
                        statuses[r.id] === status
                          ? colors.onAccent
                          : colors.ink,
                      fontWeight: "600",
                    }}
                  >
                    {sentenceLabel(status)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      ))}
      <ErrorText message={error} />
      {busy ? <Busy label="Saving class attendance…" /> : null}
      {review ? (
        <>
          <Button
            label="Confirm class attendance"
            busy={busy}
            disabled={!canSave || busy}
            onPress={() => void save()}
          />
          <Button
            label="Edit class attendance"
            secondary
            disabled={busy}
            onPress={() => setReview(false)}
          />
        </>
      ) : (
        <Button
          label="Review class attendance"
          disabled={!canSave}
          onPress={() => setReview(true)}
        />
      )}
    </>
  );
}
