import { randomUUID } from "node:crypto";
export const id = () => randomUUID();
export const managers = ["director", "admin", "principal"];
export const roles = [
  "director",
  "admin",
  "principal",
  "teacher",
  "student",
  "staff",
  "parent",
];
export function canAccessSchool(user, school) {
  return (
    user.role === "owner" ||
    ((user.orgId || null) === (school.orgId || null) &&
      user.schoolIds.includes(school.id))
  );
}
export function canSeeClass(user, classId) {
  if (user.role === "parent") return false;
  return (
    user.role === "owner" ||
    managers.includes(user.role) ||
    user.classIds.includes(classId)
  );
}
export function publicUser({ passwordHash, ...user }) {
  return user;
}
export function noticeClassIds(notice) {
  return Array.isArray(notice.classIds)
    ? notice.classIds
    : notice.classId
      ? [notice.classId]
      : [];
}
export function noticeMatchesClasses(notice, classIds) {
  const targets = noticeClassIds(notice);
  return !targets.length || targets.some((c) => classIds.includes(c));
}
export function visibleNotice(user, notice) {
  return (
    (notice.audience === "all" ||
      notice.audience === user.role ||
      (user.role === "teacher" && notice.publishedBy === user.id) ||
      managers.includes(user.role)) &&
    (!noticeClassIds(notice).length ||
      noticeClassIds(notice).some((c) => canSeeClass(user, c)))
  );
}
