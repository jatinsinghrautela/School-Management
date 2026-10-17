import React, { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { View } from "react-native";
import { useMobile } from "../provider";
import type { DeviceSession } from "../core/api";
import { Busy, Button, Card, Copy, ErrorText } from "./ui";
import { SavedMotion } from "./feedback";
import { Icon } from "./icon";
function date(value: string | number) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Unavailable" : d.toLocaleString();
}
export function AccountSecurity() {
  const { session, colors } = useMobile();
  const [items, setItems] = useState<DeviceSession[]>([]);
  const [busy, setBusy] = useState<"" | "loading" | "revoking">("loading");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(false),
    version = useRef(0),
    lock = useRef(false);
  const load = useCallback(async () => {
    const v = ++version.current;
    setBusy("loading");
    setError("");
    setItems([]);
    try {
      const result = await session.activeSessions();
      if (active.current && v === version.current) setItems(result.sessions);
    } catch (e) {
      if (active.current && v === version.current)
        setError(e instanceof Error ? e.message : "Could not load sessions.");
    } finally {
      if (active.current && v === version.current) setBusy("");
    }
  }, [session]);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      lock.current = false;
      setConfirm(false);
      setMessage("");
      void load();
      return () => {
        active.current = false;
        version.current++;
      };
    }, [load]),
  );
  async function revoke() {
    if (lock.current || busy) return;
    lock.current = true;
    const v = ++version.current;
    setBusy("revoking");
    setError("");
    setMessage("");
    try {
      const result = await session.revokeOtherSessions();
      if (!active.current || v !== version.current) return;
      setConfirm(false);
      setMessage(`${result.count} other ${result.count === 1 ? "session" : "sessions"} signed out.`);
      await load();
    } catch (e) {
      if (active.current && v === version.current)
        setError(
          `${e instanceof Error ? e.message : "Could not sign out other sessions."} Refresh the list before retrying if the connection was interrupted.`,
        );
    } finally {
      lock.current = false;
      if (active.current && v === version.current) setBusy("");
    }
  }
  return (
    <>
      <Card>
        <Icon name="shield" color={colors.accent} size={32} />
        <Copy large>Your sign-ins</Copy>
        <Copy muted>
          These sessions belong to your account across all schools. Device
          descriptions are supplied by the client and may be generic. This app
          does not receive session tokens for other sign-ins.
        </Copy>
        <Button
          label="Refresh active sessions"
          secondary
          disabled={!!busy}
          onPress={() => {
            setConfirm(false);
            void load();
          }}
        />
      </Card>
      {busy ? (
        <Busy
          label={
            busy === "revoking"
              ? "Signing out other sessions…"
              : "Loading active sessions…"
          }
        />
      ) : null}
      <ErrorText message={error} />
      {message ? (
        <SavedMotion>
          <Copy>{message}</Copy>
        </SavedMotion>
      ) : null}
      {items.map((item, index) => (
        <Card key={item.id || String(index)}>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Icon
              name={item.current ? "shield" : "profile"}
              color={colors.accent}
            />
            <Copy>
              {item.current ? "Current sign-in" : `Other sign-in ${index + 1}`}
            </Copy>
          </View>
          <Copy>{item.device}</Copy>
          <Copy muted>Started: {date(item.createdAt)}</Copy>
          <Copy muted>Expires: {date(item.expires)}</Copy>
        </Card>
      ))}
      {!busy && !error && !items.length ? (
        <Copy muted>
          No active sessions were returned. Refresh to check again.
        </Copy>
      ) : null}
      {items.some((s) => !s.current) ? (
        <Card>
          <Copy>Sign out other sessions</Copy>
          <Copy muted>
            This ends your other browser and app sign-ins across all schools.
            Your current sign-in stays active. Unsaved work elsewhere may be
            lost.
          </Copy>
          {confirm ? (
            <>
              <Button
                label="Confirm sign out other sessions"
                busy={busy === "revoking"}
                disabled={!!busy}
                onPress={() => void revoke()}
              />
              <Button
                label="Cancel session sign-out"
                secondary
                disabled={!!busy}
                onPress={() => setConfirm(false)}
              />
            </>
          ) : (
            <Button
              label="Sign out other sessions"
              disabled={!!busy}
              onPress={() => setConfirm(true)}
            />
          )}
        </Card>
      ) : null}
      <Copy muted>
        See an unfamiliar sign-in? Sign out other sessions, then change your
        password from Profile. Password changes require signing in again.
      </Copy>
    </>
  );
}
