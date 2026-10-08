import React from "react";

// Original project glyph geometry, generated for NuvyraSchola. No icon pack assets.
function glyph(path) {
  return function Glyph({ size = 24, strokeWidth = 1.7, ...props }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        <path d={path} />
      </svg>
    );
  };
}
export const Orbit = glyph("M4 18V6l8 12V6l8 12V6 M3 12h18");
export const LayoutDashboard = glyph(
  "M4 4h7v7H4z M15 4h5v4h-5z M4 15h7v5H4z M15 12h5v8h-5z",
);
export const Building2 = glyph(
  "M4 20V8l8-4 8 4v12H4 M9 20v-5h6v5 M8 10h1m6 0h1M8 13h1m6 0h1",
);
export const Users = glyph(
  "M6 20v-3q0-5 6-5t6 5v3 M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M3 10v5m18-5v5",
);
export const CalendarCheck = glyph(
  "M4 6h16v14H4z M8 3v6m8-6v6M4 11h16M8 16l3 2 5-4",
);
export const CalendarDays = glyph(
  "M4 6h16v14H4zM8 3v6m8-6v6M4 11h16M8 15h1m5 0h1M8 18h1m5 0h1",
);
export const GraduationCap = glyph(
  "M2 9l10-5 10 5-10 5zM6 12v5q6 5 12 0v-5M22 9v8",
);
export const BookOpen = glyph(
  "M12 6Q7 3 3 5v14q5-2 9 1 4-3 9-1V5q-4-2-9 1v14 M6 9l3 1m6 0 3-1",
);
export const Megaphone = glyph("M4 10h5l11-6v16L9 14H4z M7 14l2 6h3l-2-5");
export const ChevronRight = glyph("M9 5l7 7-7 7");
export const ArrowUpRight = glyph("M5 19 19 5M7 5h12v12");
export const LogOut = glyph("M10 4H4v16h6m4-12 5 4-5 4m-5-4h10");
export const Search = glyph("M4 10a6 6 0 1 0 12 0a6 6 0 1 0-12 0M15 15l6 6");
export const Plus = glyph("M12 4v16M4 12h16");
export const X = glyph("M5 5l14 14M19 5 5 19");
export const ShieldCheck = glyph(
  "M12 3l8 4v6q-1 5-8 8-7-3-8-8V7zM8 12l3 3 5-6",
);
export const Sparkles = glyph(
  "M12 3l2 6 6 3-6 2-2 7-3-7-6-2 6-3zM20 3v3m-1-2h3",
);
export const Menu = glyph("M3 6h18M3 12h12M3 18h18");
export const Check = glyph("M4 12l5 6L20 5");
export const FileText = glyph("M5 3h9l5 5v13H5zM14 3v5h5M8 12h8m-8 4h6");
export const Activity = glyph("M2 13h5l3-8 4 14 3-6h5");
export const Printer = glyph(
  "M7 8V3h10v5M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h1",
);
export const LockKeyhole = glyph(
  "M7 10V7a5 5 0 0 1 10 0v3M4 10h16v11H4zM12 14v3",
);
export const RotateCcw = glyph("M4 4v6h6M4 10a8 8 0 1 1 0 6");
