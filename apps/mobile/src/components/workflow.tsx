import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { randomUUID } from "expo-crypto";
import { useMobile } from "../provider";
import { Button, Card, Copy, ErrorText, Field } from "./ui";
export type Row = { id: string; [key: string]: unknown };
export const list = (value: unknown): Row[] =>
  Array.isArray(value) ? (value as Row[]) : [];
export const value = (row: Row, key: string) => String(row[key] ?? "");
export type Choice = { id: string; name: string };
export type Input = {
  key: string;
  label: string;
  choices?: Choice[];
  multiple?: boolean;
  optional?: boolean;
  numeric?: boolean;
  secure?: boolean;
  initial?: string;
};
export const choices = (...names: string[]): Choice[] =>
  names.map((name) => ({ id: name, name }));
export function Pick({
  label,
  options,
  selected,
  onChange,
  multiple = false,
}: {
  label: string;
  options: Choice[];
  selected: string;
  onChange: (v: string) => void;
  multiple?: boolean;
}) {
  const selectedIds = selected.split(",").filter(Boolean);
  const [search, setSearch] = useState("");
  return (
    <View style={{ gap: 10 }}>
      <Copy>{label}</Copy>
      {options.length > 8 ? (
        <Field
          label={`Search ${label.toLowerCase()}`}
          value={search}
          onChangeText={setSearch}
        />
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options
          .filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
          .slice(0, 40)
          .map((o) => (
            <Button
              key={o.id}
              label={`${selectedIds.includes(o.id) ? "✓ " : ""}${o.name}`}
              secondary={!selectedIds.includes(o.id)}
              onPress={() =>
                onChange(
                  multiple
                    ? (selectedIds.includes(o.id)
                        ? selectedIds.filter((id) => id !== o.id)
                        : [...selectedIds, o.id]
                      ).join(",")
                    : o.id,
                )
              }
            />
          ))}
      </View>
      {!options.length ? <Copy muted>No eligible options.</Copy> : null}
      {options.length > 40 ? (
        <Copy muted>Search to narrow the choices.</Copy>
      ) : null}
    </View>
  );
}
/** Explicit review step; no automatic retries; school switches unmount this form. */
export function Form({
  title,
  fields,
  submit,
  done,
}: {
  title: string;
  fields: Input[];
  submit: (data: Record<string, string>) => Promise<unknown>;
  done?: () => void;
}) {
  const { session } = useMobile();
  const [data, setData] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.initial || ""])),
  );
  const [requestKey] = useState(() => randomUUID());
  const [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const scope = session.scope();
    try {
      await submit({ ...data, requestKey });
      if (mounted.current && scope === session.scope()) {
        setSaved(true);
        setData((d) =>
          Object.fromEntries(
            Object.entries(d).map(([key, v]) => [
              key,
              fields.some((f) => f.key === key && f.secure) ? "" : v,
            ]),
          ),
        );
        done?.();
      }
    } catch (e) {
      if (mounted.current && scope === session.scope())
        setError(
          `${e instanceof Error ? e.message : "Could not save."} Refresh records before retrying if the response was interrupted.`,
        );
    } finally {
      lock.current = false;
      if (mounted.current && scope === session.scope()) setBusy(false);
    }
  }
  return (
    <Card>
      <Copy large>{title}</Copy>
      {saved ? (
        <Copy>
          Saved successfully. Refresh records to see the latest details.
        </Copy>
      ) : (
        <>
          {fields.map((f) =>
            review ? (
              <Copy key={f.key}>
                {f.label}:{" "}
                {f.choices
                  ? data[f.key]
                      ?.split(",")
                      .map((id) => f.choices?.find((o) => o.id === id)?.name)
                      .join(", ") || "None"
                  : f.secure
                    ? "Provided (hidden)"
                    : data[f.key] || "None"}
              </Copy>
            ) : f.choices ? (
              <Pick
                key={f.key}
                label={f.label}
                options={f.choices}
                selected={data[f.key] || ""}
                multiple={f.multiple}
                onChange={(v) => setData((d) => ({ ...d, [f.key]: v }))}
              />
            ) : (
              <Field
                key={f.key}
                label={f.label}
                value={data[f.key] || ""}
                keyboardType={f.numeric ? "decimal-pad" : "default"}
                secureTextEntry={f.secure}
                autoComplete={f.secure ? "current-password" : "off"}
                multiline={!f.numeric && !f.secure}
                onChangeText={(v) => setData((d) => ({ ...d, [f.key]: v }))}
              />
            ),
          )}
          <ErrorText message={error} />
          {review ? (
            <>
              <Button
                label={busy ? "Saving…" : "Confirm and save"}
                disabled={busy}
                onPress={() => void save()}
              />
              <Button
                label="Edit details"
                disabled={busy}
                secondary
                onPress={() => setReview(false)}
              />
            </>
          ) : (
            <Button
              label="Review details"
              disabled={fields.some((f) => !f.optional && !data[f.key]?.trim())}
              onPress={() => setReview(true)}
            />
          )}
        </>
      )}
    </Card>
  );
}
export function Records({ rows, fields }: { rows: Row[]; fields: string[] }) {
  const [limit, setLimit] = useState(20),
    [search, setSearch] = useState("");
  const filtered = rows.filter((r) =>
    fields
      .map((k) => value(r, k))
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Field label="Search records" value={search} onChangeText={setSearch} />
      {filtered.slice(0, limit).map((r, i) => (
        <Card key={r.id || i}>
          {fields.map((f) =>
            value(r, f) ? (
              <Copy key={f}>
                {f}: {value(r, f)}
              </Copy>
            ) : null,
          )}
        </Card>
      ))}
      {!filtered.length ? <Copy muted>No records to show.</Copy> : null}
      {filtered.length > limit ? (
        <Button
          label="Show more records"
          secondary
          onPress={() => setLimit((n) => n + 20)}
        />
      ) : null}
    </>
  );
}

export function useAlive() {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return () => alive.current;
}
