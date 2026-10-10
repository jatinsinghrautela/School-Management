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
  return (
    <label className="theme-switch">
      <span>Theme</span>
      <select
        aria-label="Color theme"
        value={mode}
        onChange={(event) => change(event.target.value)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
