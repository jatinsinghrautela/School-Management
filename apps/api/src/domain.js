import { randomUUID } from 'node:crypto';
export const id = () => randomUUID();
export const managers = ['director','admin','principal'];
export const roles = ['director','admin','principal','teacher','student','staff'];
export function canAccessSchool(user, school) {
  return user.role === 'owner' || (user.orgId === school.orgId && user.schoolIds.includes(school.id));
}
export function canSeeClass(user, classId) {
  return user.role === 'owner' || managers.includes(user.role) || user.classIds.includes(classId);
}
export function publicUser({passwordHash,...user}) { return user; }
export function visibleNotice(user, notice) {
  return (notice.audience === 'all' || notice.audience === user.role || managers.includes(user.role)) && (!notice.classId || canSeeClass(user,notice.classId));
}
