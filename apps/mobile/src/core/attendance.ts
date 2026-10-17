export const attendanceStatuses = [
  "present",
  "absent",
  "late",
  "excused",
] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];
type Person = {
  id: string;
  name?: unknown;
  role?: unknown;
  classIds?: unknown;
};
type RecordRow = { id: string; [key: string]: unknown };
export function attendanceRoster(
  users: Person[],
  records: RecordRow[],
  classId: string,
  date: string,
  sessionId: string,
) {
  return users
    .filter(
      (u) =>
        u.role === "student" &&
        Array.isArray(u.classIds) &&
        u.classIds.includes(classId),
    )
    .map((u) => {
      const old = records.find(
        (r) =>
          r.classId === classId &&
          r.studentId === u.id &&
          r.date === date &&
          (r.sessionId || "") === sessionId,
      );
      return {
        id: u.id,
        name: String(u.name || u.id),
        locked: !!old,
        status: old ? String(old.status) : "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
