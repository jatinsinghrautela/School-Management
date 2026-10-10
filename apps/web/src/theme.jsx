import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useId,
} from "react";
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
  const sceneId = useId().replace(/:/g, "");
  const [systemDark, setSystemDark] = useState(media.matches);
  useEffect(() => {
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const dark = mode === "dark" || (mode === "system" && systemDark);
  return (
    <button
      type="button"
      className={`scene-toggle ${dark ? "night" : "day"}`}
      role="switch"
      aria-label="Dark mode"
      aria-checked={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => change(dark ? "light" : "dark")}
    >
      <svg viewBox="0 0 180 88" aria-hidden="true">
        <defs>
          <linearGradient id={`${sceneId}-sky`}>
            <stop stopColor="#90d8f5" />
            <stop offset=".48" stopColor="#386bb2" />
            <stop offset="1" stopColor="#080b48" />
          </linearGradient>
          <linearGradient id={`${sceneId}-pearl`} x2="1" y2="1">
            <stop stopColor="#fff4cd" />
            <stop offset=".6" stopColor="#eef6ff" />
            <stop offset="1" stopColor="#7e98c4" />
          </linearGradient>
          <clipPath id={`${sceneId}-clip`}>
            <rect x="2" y="5" width="176" height="78" rx="39" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${sceneId}-clip)`}>
          <rect
            x="2"
            y="5"
            width="176"
            height="78"
            fill={`url(#${sceneId}-sky)`}
          />
          <circle
            cx="44"
            cy="44"
            r="51"
            fill="none"
            stroke="#ffe3ad"
            strokeWidth="13"
          />
          <circle
            cx="44"
            cy="44"
            r="39"
            fill="none"
            stroke="#d0ebf9"
            strokeWidth="9"
          />
          <g className="scene-clouds" fill="#eaf6ff" opacity=".7">
            <path d="M10 60q4-8 10-3 5-11 12-2 8-2 10 5zM30 23q5-8 11-2 5-9 11 2z" />
          </g>
          <g className="scene-stars" fill="#fff8d5">
            <path d="m134 20 2 4 4 1-4 2-2 4-1-4-4-2 4-1zM151 30l2 3 4 1-4 2-2 3-1-3-3-2 3-1zM120 34l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
            <circle cx="156" cy="17" r="1.5" />
            <circle cx="139" cy="39" r="1.5" />
          </g>
          <g className="scene-city" fill="#1e3868">
            <path d="M112 77V51h9v26m3 0V43h11v34m4 0V55h10v22m4 0V49h9v28" />
            <path
              d="M10 77V62h12v15m4 0V56h10v21m4 0V64h10v13"
              fill="#4384b4"
            />
            <path
              d="M115 55h2m-2 5h2m-2 5h2m11-17h2m-2 5h2m-2 5h2m-2 5h2m-2 5h2m12-9h2m-2 5h2m-2 5h2m12-15h2m-2 5h2m-2 5h2m-2 5h2"
              stroke="#ffd665"
              strokeWidth="2"
            />
          </g>
        </g>
        <g className="scene-thumb">
          <circle cx="44" cy="44" r="37" fill="#0b2850" />
          <circle cx="44" cy="44" r="32" fill={`url(#${sceneId}-pearl)`} />
          <circle
            className="scene-phase"
            cx="35"
            cy="33"
            r="27"
            fill="#153b56"
          />
        </g>
      </svg>
    </button>
  );
}
