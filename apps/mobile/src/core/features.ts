import { dailySections } from "./capabilities.ts";
export type Feature = {
  label: string;
  icon: string;
  screen?: "daily" | "work" | "services" | "settings" | "group" | "security";
  children?: string[];
  section?: string;
  reason?: string;
};
const leaders = ["admin", "principal", "director"];
const daily: Feature[] = [
  { label: "Notices", icon: "✉", screen: "daily", section: "notices" },
  {
    label: "Homework & resources",
    icon: "▤",
    screen: "daily",
    section: "learning",
  },
  { label: "Timetable", icon: "◷", screen: "daily", section: "timetable" },
  { label: "Calendar", icon: "▦", screen: "daily", section: "calendar" },
  { label: "Attendance", icon: "✓", screen: "daily", section: "attendance" },
  {
    label: "Published results",
    icon: "☆",
    screen: "daily",
    section: "results",
  },
  { label: "Fees & receipts", icon: "≋", screen: "daily", section: "fees" },
  { label: "School gallery", icon: "▧", screen: "daily", section: "gallery" },
];
export function featuresFor(role: string): Feature[] {
  const staff = [...leaders, "teacher", "staff"].includes(role);
  const manager = leaders.includes(role);
  const result = daily.filter((f) => dailySections(role).includes(f.section!));
  const add = (
    label: string,
    icon: string,
    screen: Feature["screen"],
    section?: string,
  ) => result.push({ label, icon, screen, section });
  const web = (label: string, icon: string, reason: string) =>
    result.push({ label, icon, reason });
  if (staff)
    for (const [label, icon, section] of role === "staff"
      ? [["Staff leave", "☂", "Leave"]]
      : [
          ["Teaching timetable", "◴", "Timetable"],
          ["Class directory", "♙", "People"],
          ["Record attendance", "☑", "Attendance"],
          ["Attendance corrections", "↺", "Corrections"],
          ["Exam marks", "✎", "Marks"],
          ["Student reports", "▥", "Reports"],
          ["Publish learning material", "⊞", "Resources"],
          ["Homework reviews", "✐", "Homework reviews"],
          ["Publish notices", "◈", "Notices"],
          ["Staff leave", "☂", "Leave"],
        ])
      add(label, icon, "work", section);
  if (role !== "owner") {
    for (const [label, icon, section] of [
      ["Library & transport", "▣", "Library & transport"],
      ["Inbox", "◉", "Inbox"],
      ["Support tickets", "?", "Support"],
      ["Privacy & data", "◇", "Privacy"],
    ])
      add(label, icon, "services", section);
    if ([...leaders, "parent", "student"].includes(role))
      add("School documents", "▱", "services", "Documents");
    if ([...leaders, "teacher", "parent"].includes(role))
      add("Messages", "☏", "services", "Messages");
    if (manager || role === "student")
      add("Student records", "♧", "services", "Student records");
  }
  if (manager) {
    add("Fee management", "≋", "services", "Fees");
    add("Visitors", "⇥", "services", "Visitors");
    add("Publish event photos", "▧", "work", "Gallery");
    add("Admission lookup", "♙", "work", "Admissions");
    add("Manage calendar events", "▦", "work", "Calendar");
    web(
      "Admissions & account onboarding",
      "♙",
      "Complete identity checks, guardian linking and account creation on the website.",
    );
    web(
      "People imports & access",
      "⇧",
      "Use the website for Excel imports, credentials, role changes and account administration.",
    );
    web(
      "Yearly fee planning",
      "≋",
      "Plan the academic year's charges and schedules on the website.",
    );
    web(
      "Timetable planner",
      "◷",
      "Use the full weekly planner, teacher allocation and spreadsheet tools on the website.",
    );
    web(
      "Annual calendar workbook",
      "▦",
      "Download, edit and import the yearly holiday workbook from the website.",
    );
    web(
      "Academic setup & progression",
      "☆",
      "Configure years, terms, subjects, exams and promotions on the website.",
    );
    web(
      "School branding & policy",
      "◇",
      "Configure school identity, logo and approved policies on the website.",
    );
    web(
      "Transport, inventory & catalogue setup",
      "▣",
      "Manage routes, seat allocation, inventory and catalogue configuration on the website.",
    );
  } else if (role === "teacher")
    web(
      "Spreadsheet exports",
      "⇩",
      "Use the website for the full spreadsheet export tools.",
    );
  if (role === "owner")
    for (const [label, icon] of [
      ["Schools & organizations", "▣"],
      ["Leadership onboarding", "♙"],
      ["Support impersonation", "◇"],
      ["Platform KPIs & diagnostics", "▥"],
      ["Backups & deployment", "⇧"],
    ])
      web(
        label,
        icon,
        "This platform administration feature is available from the website.",
      );
  add("Active sessions", "◇", "security");
  add("Account & appearance", "⚙", "settings");
  return result;
}

export const featureId = (feature: Feature) =>
  (feature.screen === "group" ? "section-" : "") +
  feature.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
/** Same top-level labels and role visibility as the website sidebar. */
export function sidebarFeatures(role: string): Feature[] {
  const manager = leaders.includes(role),
    teacher = role === "teacher";
  const group = (label: string, icon: string, children: string[]): Feature => ({
    label,
    icon,
    screen: "group",
    children,
  });
  const common: Feature[] = [
    group("Library", "▣", ["Library & transport"]),
    group("Transport", "⇥", [
      "Library & transport",
      "Transport, inventory & catalogue setup",
    ]),
    group("Operations", "⊞", [
      "Support tickets",
      "School documents",
      "Visitors",
      "Library & transport",
      "Transport, inventory & catalogue setup",
    ]),
    group("Inbox", "◉", ["Inbox", "Messages"]),
    group("Gallery", "▧", ["School gallery", "Publish event photos"]),
    group("Security", "◇", [
      "Active sessions",
      "Privacy & data",
      "Account & appearance",
    ]),
  ];
  if (role === "owner")
    return [
      group("Overview", "⌂", ["Platform KPIs & diagnostics"]),
      group("Schools", "▣", ["Schools & organizations"]),
      group("People", "♙", ["Leadership onboarding"]),
      group("Security", "◇", [
        "Active sessions",
        "Support impersonation",
        "Backups & deployment",
        "Account & appearance",
      ]),
    ];
  const family = group("Family", "♧", [
    "Homework & resources",
    "Attendance",
    "Published results",
    "Fees & receipts",
    "School documents",
    "Messages",
    "Admissions & account onboarding",
  ]);
  if (role === "parent") return [family, ...common];
  return [
    group("Overview", "⌂", []),
    group("People", "♙", [
      "Class directory",
      "Student records",
      "Admission lookup",
      "Admissions & account onboarding",
      "People imports & access",
    ]),
    ...(manager || role === "student"
      ? [
          group("Fees", "≋", [
            "Fees & receipts",
            "Fee management",
            "Yearly fee planning",
          ]),
        ]
      : []),
    ...(manager || teacher || role === "staff"
      ? [group("Staff", "☂", ["Staff leave"])]
      : []),
    ...(manager || teacher
      ? [
          group("Academics", "☆", [
            "Exam marks",
            "Student reports",
            "Academic setup & progression",
            "Spreadsheet exports",
          ]),
        ]
      : []),
    group("Attendance", "✓", [
      "Attendance",
      "Record attendance",
      "Attendance corrections",
    ]),
    group("Timetable", "◷", [
      "Timetable",
      "Teaching timetable",
      "Timetable planner",
    ]),
    group("Calendar", "▦", [
      "Calendar",
      "Manage calendar events",
      "Annual calendar workbook",
    ]),
    group("Results", "☆", [
      "Published results",
      "Exam marks",
      "Student reports",
    ]),
    group("Learning", "▤", [
      "Homework & resources",
      "Publish learning material",
      "Homework reviews",
    ]),
    group("Notices", "✉", ["Notices", "Publish notices"]),
    ...common.slice(0, 5),
    ...(manager
      ? [
          family,
          group("Settings", "⚙", [
            "School branding & policy",
            "Account & appearance",
          ]),
        ]
      : []),
    common[5],
  ];
}
export const allFeatures = (role: string) => [
  ...featuresFor(role),
  ...sidebarFeatures(role).filter(
    (group) =>
      !featuresFor(role).some((f) => featureId(f) === featureId(group)),
  ),
];
