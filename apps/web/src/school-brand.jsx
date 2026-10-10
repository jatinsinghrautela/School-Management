import React from "react";
import "./school-brand.css";

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
