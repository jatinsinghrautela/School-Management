import React from "react";
import "./school-brand.css";

export const schoolPalettes = [
  ["Forest", "#11796f"],
  ["Ocean", "#245ac0"],
  ["Violet", "#7150b8"],
  ["Rose", "#a53e65"],
  ["Amber", "#996019"],
];
export function schoolColors(accent = "#11796f") {
  if (!/^#[a-f0-9]{6}$/i.test(accent)) accent = "#11796f";
  const rgb = [1, 3, 5]
    .map((i) => parseInt(accent.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return {
    "--school-accent": accent,
    "--school-ink": luminance > 0.179 ? "#101d21" : "#ffffff",
  };
}
export function SchoolIdentity({ name, logo }) {
  return (
    <>
      <span className="school-brand-mark">
        {logo ? (
          <img src={logo} alt={`${name} logo`} />
        ) : (
          <span aria-label={`${name} fallback logo`}>
            {name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((word) => word[0])
              .join("")
              .toUpperCase()}
          </span>
        )}
      </span>
      <span className="school-brand-name">{name}</span>
    </>
  );
}
