import { id } from "./domain.js";
export async function assignEnrollmentNumber(
  tx,
  school,
  user,
  { convert = false } = {},
) {
  if (!["student", "teacher"].includes(user.role)) return null;
  const kind = user.role === "student" ? "studentProfiles" : "staffProfiles";
  const field = user.role === "student" ? "admissionNumber" : "employeeNumber";
  const memberField = user.role === "student" ? "studentId" : "userId";
  const profiles = await tx.all(kind, school.id);
  const previous = profiles.find((p) => p[memberField] === user.id);
  const prefix = String(school.code || "SCH")
    .replace(/\s+/g, "")
    .slice(0, 40);
  if (
    previous?.[field] &&
    (!convert ||
      (previous[field].startsWith(prefix) &&
        /^\d+$/.test(previous[field].slice(prefix.length))))
  )
    return previous[field];
  // The enclosing school transaction serializes allocation. Never reuse archived numbers.
  const used = profiles
    .flatMap((p) => [p[field], ...(p.previousEnrollmentNumbers || [])])
    .filter(Boolean);
  let sequence =
    used.reduce((max, value) => {
      const suffix = value.startsWith(prefix) ? value.slice(prefix.length) : "";
      if (/^\d+$/.test(suffix) && !Number.isSafeInteger(Number(suffix)))
        throw Object.assign(
          new Error(
            "Enrollment sequence exceeds the supported range; review existing numbers",
          ),
          { status: 409 },
        );
      return /^\d+$/.test(suffix) ? Math.max(max, Number(suffix)) : max;
    }, 0) + 1;
  if (!Number.isSafeInteger(sequence))
    throw Object.assign(
      new Error(
        "Enrollment sequence exceeds the supported range; review existing numbers",
      ),
      { status: 409 },
    );
  let number = prefix + String(sequence).padStart(6, "0");
  while (used.some((value) => value.toLowerCase() === number.toLowerCase()))
    number = prefix + String(++sequence).padStart(6, "0");
  const base =
    user.role === "student"
      ? { birthDate: null, address: "" }
      : {
          jobTitle: "Teacher",
          department: "Teaching",
          joinDate: new Date().toISOString().slice(0, 10),
          profileNeedsReview: true,
        };
  await tx.put(kind, {
    ...base,
    ...previous,
    id: previous?.id || id(),
    schoolId: school.id,
    [memberField]: user.id,
    [field]: number,
    ...(previous?.[field]
      ? {
          previousEnrollmentNumber: previous[field],
          previousEnrollmentNumbers: [
            ...(previous.previousEnrollmentNumbers || []),
            previous[field],
          ],
        }
      : {}),
    updatedAt: new Date().toISOString(),
  });
  return number;
}
