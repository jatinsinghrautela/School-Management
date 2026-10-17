import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { apiBase, createApi, sessionStorageKey } from "./core/api";
import { Session } from "./core/session";
import { clearTemporaryArtifacts } from "./artifacts";
const configured =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://schoolglass.jatinsinghrautela.com";
export const endpoint = apiBase(configured, __DEV__);
export const api = createApi(endpoint);
const tokenKey = sessionStorageKey(endpoint);
let webToken: string | null = null;
const options = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const vault = {
  read: () =>
    Platform.OS === "web"
      ? Promise.resolve(webToken)
      : SecureStore.getItemAsync(tokenKey, options),
  write: async (token: string) => {
    if (Platform.OS === "web") webToken = token;
    else await SecureStore.setItemAsync(tokenKey, token, options);
  },
  clear: async () => {
    if (Platform.OS === "web") webToken = null;
    else await SecureStore.deleteItemAsync(tokenKey, options);
  },
};
const light = {
  bg: "#ecf4f1",
  surface: "rgba(255,255,255,0.94)",
  hero: "#123c38",
  ink: "#162e30",
  muted: "#51686b",
  line: "#cededb",
  accent: "#11796f",
  onAccent: "#ffffff",
  error: "#a12635",
};
const dark = {
  bg: "#101f23",
  surface: "rgba(25,43,48,0.96)",
  hero: "#153d3b",
  ink: "#f0f7f5",
  muted: "#b2c8cb",
  line: "#526e6c",
  accent: "#a4e8d3",
  onAccent: "#123c35",
  error: "#ffb3bc",
};
type Context = {
  session: Session;
  state: Session["state"];
  colors: typeof light;
  dark: boolean;
  toggle: () => void;
};
const MobileContext = createContext<Context | null>(null);
export function MobileProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [, redraw] = useState(0);
  const [session] = useState(
    () => new Session(api, vault, () => redraw((n) => n + 1)),
  );
  useEffect(() => {
    try {
      clearTemporaryArtifacts();
    } catch {
      /* Private cache cleanup is retried on the next launch. */
    }
    void session.restore();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && session.state.status === "ready")
        void session.restore();
    });
    return () => subscription.remove();
  }, [session]);
  const isDark = choice ?? system === "dark";
  return (
    <MobileContext.Provider
      value={{
        session,
        state: session.state,
        colors: isDark ? dark : light,
        dark: isDark,
        toggle: () => setChoice(!isDark),
      }}
    >
      {children}
    </MobileContext.Provider>
  );
}
export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) throw Error("Mobile provider missing");
  return context;
}
