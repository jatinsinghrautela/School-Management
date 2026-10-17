import React from "react";
import Svg, { Path } from "react-native-svg";
/** Original small line drawings; no icon-font loading or remote artwork. */
const paths: Record<string, string> = {
  home: "M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10",
  profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3c0-6 16-6 16 0v3M4 21h16",
  people:
    "M14 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M3 20v-3c0-5 15-5 15 0v3M18 4c5 0 5 7 1 7M20 14c2 1 2 4 2 6",
  services: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
  school: "M3 21V9l9-6 9 6v12ZM8 21v-6h8v6M7 10h1M16 10h1M12 7v3",
  calendar: "M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16M8 14h1M14 14h1M8 18h1M14 18h1",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v6l4 2",
  attendance: "M5 3h14v18H5ZM9 3v3h6V3M8 13l3 3 5-6",
  exam: "M4 4h10v16H4ZM7 8h4M7 12h3M14 16l6-10 2 1-6 10-3 2Z",
  chart: "M4 3v18h17M8 17v-5M13 17V8M18 17V5",
  book: "M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-3-1-7-2-10 1Z",
  library: "M3 4h4v17H3ZM10 4h4v17h-4ZM16 5l4-1 3 16-4 1Z",
  bell: "M4 17h16l-2-4V9C18 1 6 1 6 9v4ZM9 21h6",
  mail: "M3 5h18v14H3ZM3 6l9 7 9-7",
  gallery: "M3 3h18v18H3ZM3 17l6-7 5 5 3-3 4 5M16 7h.1",
  transport: "M5 3h14v15H5ZM5 11h14M5 6h14M8 18v3M16 18v3M8 15h.1M16 15h.1",
  shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6",
  settings:
    "M8 3h8v4l4 2v6l-4 2v4H8v-4l-4-2V9l4-2ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  fees: "M3 5h18v15H3ZM3 9h18M7 15h4M16 15h1",
  support:
    "M3 13v-2a9 9 0 0 1 18 0v2M3 11h4v7H3ZM17 11h4v7h-4ZM20 18c0 4-5 3-8 3",
  document: "M5 2h9l5 5v15H5ZM14 2v6h5M8 12h8M8 16h8",
  leave: "M3 7h18v14H3ZM8 7V3h8v4M3 12h18M10 12v3h4v-3",
  arrow: "M4 12h16M14 6l6 6-6 6",
  back: "M20 12H4M10 6l-6 6 6 6",
  logout: "M9 3H3v18h6M10 12h12M17 7l5 5-5 5",
  check: "M4 12l5 5L20 6",
  upload: "M12 16V3M6 9l6-6 6 6M3 16v5h18v-5",
  download: "M12 3v13M6 10l6 6 6-6M3 18v3h18v-3",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0M15 15l6 6",
  close: "M5 5l14 14M19 5 5 19",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2",
  moon: "M20 15C9 19 4 9 10 3 0 5 1 20 12 21c4 0 7-2 8-6Z",
};
export function iconName(label: string) {
  const s = label.toLowerCase();
  for (const [test, name] of [
    [/sign out/, "logout"],
    [/back/, "back"],
    [/close|clear|cancel/, "close"],
    [/light mode/, "sun"],
    [/dark mode/, "moon"],
    [/attendance|correction/, "attendance"],
    [/exam|marks/, "exam"],
    [/results|reports|kpi|diagnostic/, "chart"],
    [/homework|learning|academic/, "book"],
    [/library|catalogue/, "library"],
    [/timetable|school day/, "clock"],
    [/calendar/, "calendar"],
    [/notice|notification/, "bell"],
    [/inbox|message/, "mail"],
    [/photo|gallery/, "gallery"],
    [/transport/, "transport"],
    [/privacy|security|password|impersonation|sessions/, "shield"],
    [/fees|fee |payment|receipt|ledger|concession/, "fees"],
    [/staff|leave/, "leave"],
    [/support/, "support"],
    [/document|export|spreadsheet/, "document"],
    [/upload|publish/, "upload"],
    [/download/, "download"],
    [/profile|account|onboarding/, "profile"],
    [/people|student|family|guardian|class|admission/, "people"],
    [/school|organization/, "school"],
    [/settings|appearance/, "settings"],
    [/services|operations/, "services"],
    [/home|overview|dashboard/, "home"],
    [/save|confirm|review|done/, "check"],
  ] as [RegExp, string][])
    if (test.test(s)) return name;
  return paths[s] ? s : "arrow";
}
export function Icon({
  name,
  color,
  size = 24,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <Svg
      accessible={false}
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d={paths[iconName(name)]}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
