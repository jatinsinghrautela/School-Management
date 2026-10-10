import React, { createContext, useContext, useEffect, useState } from "react";
import "./theme.css";

const key = "schoolglass-theme";
const modes = ["system", "light", "dark"];
const media = window.matchMedia("(prefers-color-scheme: dark)");
function read() {
  try {
    const value = localStorage.getItem(key);
    return modes.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}
function apply(mode) {
  const dark = mode === "dark" || (mode === "system" && media.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
apply(read());
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(read);
  useEffect(() => {
    const update = () => apply(mode);
    update();
    media.addEventListener("change", update);
    const storage = (event) => {
      if (event.key === key || event.key === null) setMode(read());
    };
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("storage", storage);
    };
  }, [mode]);
  function change(value) {
    apply(value);
    setMode(value);
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Theme remains usable when storage is unavailable. */
    }
  }
  return (
    <ThemeContext.Provider value={{ mode, change }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeSwitch() {
  const { mode, change } = useContext(ThemeContext);
  const [systemDark, setSystemDark] = useState(media.matches);
  useEffect(() => {
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const dark = mode === "dark" || (mode === "system" && systemDark);
  return (
    <div className="appearance-toggle" role="group" aria-label="Color theme">
      <span
        className={dark ? "toggle-indicator dark" : "toggle-indicator"}
        aria-hidden="true"
      />
      {["light", "dark"].map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={dark === (value === "dark")}
          onClick={() => change(value)}
        >
          <span aria-hidden="true">{value === "light" ? "☀" : "☾"}</span>
          {value === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}
