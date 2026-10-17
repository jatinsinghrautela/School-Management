import React, { useState } from "react";
import { useMobile } from "../provider";
import { Button, Card, Copy, ErrorText, Field } from "./ui";
export function ChangePassword() {
  const { session } = useMobile();
  const [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Card>
      <Copy large>Change password</Copy>
      <Copy muted>You will sign in again after changing your password.</Copy>
      <Field
        label="Current password"
        secureTextEntry
        value={current}
        onChangeText={setCurrent}
        autoComplete="current-password"
      />
      <Field
        label="New password"
        secureTextEntry
        value={next}
        onChangeText={setNext}
        autoComplete="new-password"
      />
      <Field
        label="Confirm new password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        autoComplete="new-password"
      />
      <ErrorText message={error} />
      <Button
        label="Update password"
        busy={busy}
        disabled={busy || next.length < 12 || next !== confirm || !current}
        onPress={() => {
          setBusy(true);
          setError("");
          void session
            .changePassword(current, next)
            .catch((e) =>
              setError(
                e instanceof Error ? e.message : "Could not change password",
              ),
            )
            .finally(() => {
              setBusy(false);
              setCurrent("");
              setNext("");
              setConfirm("");
            });
        }}
      />
    </Card>
  );
}
