export type Entry = {
  id: string;
  title?: string;
  name?: string;
  body?: string;
  description?: string;
  type?: string;
  kind?: string;
  cancelled?: boolean;
  date?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  createdAt?: string;
  readAt?: string | null;
  audience?: string;
  url?: string;
  classId?: string;
  fileId?: string;
  hasAttachment?: boolean;
  day?: number;
  start?: string;
  end?: string;
  room?: string;
  subjectId?: string;
  subjectName?: string;
  teacherName?: string;
  className?: string;
  status?: string;
  sessionName?: string;
  excludedFromAttendance?: boolean;
  examName?: string;
  percentage?: number;
  grade?: string;
  version?: number;
  rows?: {
    name: string;
    score: number;
    maxScore: number;
    passed?: boolean;
    weight?: number;
  }[];
  amountMinor?: number;
  paidMinor?: number;
  concessionMinor?: number;
  outstandingMinor?: number;
  currency?: string;
  receiptNumber?: string;
  paidOn?: string;
  method?: string;
  voided?: boolean;
  caption?: string;
  studentId?: string;
  resourceId?: string;
  answer?: string;
  attachmentId?: string;
  reviews?: { feedback?: string; decision?: string; createdAt?: string }[];
};
export type Child = {
  id: string;
  name: string;
  attendance: Entry[];
  reports: Entry[];
  resources: Entry[];
  timetable: Entry[];
  fees: Entry[];
  payments?: Entry[];
  notices: Entry[];
  calendar: Entry[];
};
export type Family = {
  children: { id: string; name: string; classes: string[] }[];
  child: Child | null;
};
export type Artifact = {
  filename: string;
  mime?: string;
  base64?: string;
  html?: string;
};
export const sections = [
  "notices",
  "learning",
  "timetable",
  "calendar",
  "attendance",
  "results",
  "fees",
  "gallery",
] as const;
export type Section = (typeof sections)[number];
export const labels: Record<Section, string> = {
  notices: "Notices",
  learning: "Homework & resources",
  timetable: "Timetable",
  calendar: "Calendar",
  attendance: "Attendance",
  results: "Published results",
  fees: "Fees & receipts",
  gallery: "School gallery",
};
export function rows(value: unknown): Entry[] {
  return Array.isArray(value) ? (value as Entry[]) : [];
}
export function money(minor = 0, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}
export function attendanceSummary(entries: Entry[]) {
  const included = entries.filter((e) => !e.excludedFromAttendance);
  return {
    total: included.length,
    present: included.filter((e) =>
      ["present", "late"].includes(e.status || ""),
    ).length,
    excluded: entries.length - included.length,
  };
}
export function webUrl(value: string) {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error("This resource link is not a safe web address.");
  return url.href;
}
export function artifactName(name: string) {
  return (
    (name?.split(/[\\/]/).pop() || "school-document")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/^\.+/, "")
      .slice(0, 120) || "school-document"
  );
}
