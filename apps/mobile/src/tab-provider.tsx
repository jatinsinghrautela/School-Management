import React, { createContext, useContext } from "react";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useMobile } from "./provider";
import { needsSchoolChoice } from "./core/session";
import { tabForPath, tabIds, type TabId } from "./core/tabs";
const Context = createContext<{
  active: TabId;
  index: number;
  enabled: boolean;
  go: (index: number) => void;
  step: (direction: number) => void;
} | null>(null);
export function TabProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    params = useGlobalSearchParams<{ tab?: string }>(),
    { state } = useMobile();
  const active = tabForPath(path, params.tab),
    index = tabIds.indexOf(active);
  const enabled =
    state.status === "ready" &&
    !state.identity?.user.passwordChangeRequired &&
    !needsSchoolChoice(state);
  function go(next: number) {
    if (!enabled || next < 0 || next > 3) return;
    const targets = ["/", "/school-day", "/services", "/profile"] as const;
    router.navigate(targets[next]);
  }
  return (
    <Context.Provider
      value={{
        active,
        index,
        enabled,
        go,
        step: (direction) => go(index + direction),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTabs() {
  const value = useContext(Context);
  if (!value) throw Error("Tab provider missing");
  return value;
}
