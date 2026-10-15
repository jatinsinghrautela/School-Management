import React, { createContext, useContext, useEffect, useState } from "react";
import { useMobile } from "./provider";
import type { Family } from "./core/daily";
export function useSchoolData<T>(path: string | null) {
  const { session } = useMobile();
  const [revision, setRevision] = useState(0);
  const key = `${session.scope()}:${path}:${revision}`;
  const [value, setValue] = useState<{
    key: string;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ key: "", data: null, error: "", loading: false });
  useEffect(() => {
    if (!path) return;
    let active = true;
    session
      .school<T>(path)
      .then((data) => {
        if (active) setValue({ key, data, error: "", loading: false });
      })
      .catch((error) => {
        if (active)
          setValue({
            key,
            data: null,
            error:
              error instanceof Error ? error.message : "Could not load records",
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, [key, path, session]);
  const current = value.key === key;
  return {
    data: current ? value.data : null,
    error: current ? value.error : "",
    loading: !!path && (!current || value.loading),
    refresh: () => setRevision((n) => n + 1),
  };
}
const Context = createContext<{
  family: Family | null;
  childId: string;
  selectChild: (id: string) => void;
  loading: boolean;
  error: string;
  refresh: () => void;
} | null>(null);
export function DailyProvider({ children }: { children: React.ReactNode }) {
  const { session, state } = useMobile();
  const scope = session.scope();
  const [selected, setSelected] = useState({ scope: "", id: "" });
  const childId = selected.scope === scope ? selected.id : "";
  const enabled =
    state.status === "ready" &&
    state.identity?.user.role === "parent" &&
    !!state.schoolId;
  const remote = useSchoolData<Family>(
    enabled
      ? `/family${childId ? `?childId=${encodeURIComponent(childId)}` : ""}`
      : null,
  );
  return (
    <Context.Provider
      value={{
        family: remote.data,
        childId,
        selectChild: (id) => setSelected({ scope, id }),
        loading: remote.loading,
        error: remote.error,
        refresh: remote.refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFamily() {
  const value = useContext(Context);
  if (!value) throw Error("Daily context missing");
  return value;
}
