/** Presentation only: never normalize stored values, passwords or user-written content. */
export function sentenceLabel(value: string): string {
  const words = value.replace(/_+/g, " ").trim();
  if (["upi", "pdf", "url", "html", "sms"].includes(words.toLowerCase()))
    return words.toUpperCase();
  return words ? words[0].toUpperCase() + words.slice(1) : "";
}
export function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    loginEmail: "Login email",
    employeeNumber: "Employee number",
    admissionNumber: "Admission number",
    excludedFromAttendance: "Excluded from attendance",
    paidOn: "Payment date",
    readAt: "Read on",
    createdAt: "Created on",
    updatedAt: "Updated on",
    submittedAt: "Submitted on",
    requestedStatus: "Requested status",
  };
  return (
    labels[key] ||
    sentenceLabel(
      key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase(),
    ).replace(/\b(id|ids|url|pdf|isbn)\b/gi, (s) =>
      s.toLowerCase() === "ids" ? "IDs" : s.toUpperCase(),
    )
  );
}
const enums = new Set([
  "role",
  "status",
  "requestedStatus",
  "kind",
  "type",
  "method",
  "condition",
  "relationship",
  "audience",
  "priority",
]);
const booleans = new Set([
  "active",
  "excludedFromAttendance",
  "passwordChangeRequired",
  "consentVerified",
]);
export function recordText(key: string, raw: unknown): string {
  if (booleans.has(key) && (raw === true || raw === "true")) return "Yes";
  if (booleans.has(key) && (raw === false || raw === "false")) return "No";
  const text = String(raw ?? "");
  return enums.has(key) ? sentenceLabel(text) : text;
}
