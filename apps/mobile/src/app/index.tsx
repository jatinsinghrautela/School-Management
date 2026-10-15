import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api, endpoint, useMobile } from "../provider";
import { Busy, Button, Card, Copy, ErrorText, Field } from "../components/ui";
import { DailyMenu } from "../components/daily-menu";
function SignIn() {
  const { session, state } = useMobile();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [sending, setSending] = useState(false);
  async function reset() {
    setSending(true);
    setMessage("");
    try {
      const response = await api.forgotPassword(email);
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please retry");
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <Copy large>Your school day, connected.</Copy>
      <Copy muted>
        Sign in with the account provided by your school. No self-registration
        is required.
      </Copy>
      <Card>
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        <ErrorText message={state.error} />
        {state.busy ? (
          <>
            <Busy />
            <Copy muted>{state.activity}</Copy>
          </>
        ) : null}
        <Button
          label="Sign in"
          disabled={state.busy || sending || !email.trim() || !password}
          onPress={() => {
            void session.login(email, password);
            setPassword("");
          }}
        />
        <Button
          label="Request password reset"
          secondary
          disabled={state.busy || sending || !email.trim()}
          onPress={() => void reset()}
        />
        {message ? <Copy>{message}</Copy> : null}
      </Card>
      <Copy muted>
        Connected to {new URL(endpoint).host}. Reset delivery depends on your
        school’s configured service.
      </Copy>
    </>
  );
}
function PasswordChange() {
  const { session } = useMobile();
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function change() {
    if (password !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await session.changePassword(current, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Copy large>Make your account yours.</Copy>
      <Copy muted>
        Change your temporary password before opening your school workspace.
      </Copy>
      <Card>
        <Field
          label="Current password"
          secureTextEntry
          value={current}
          onChangeText={setCurrent}
        />
        <Field
          label="New password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
        />
        <Field
          label="Confirm new password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
        <Copy muted>Use at least 12 characters and a different password.</Copy>
        <ErrorText message={error} />
        <Button
          label="Change password"
          disabled={busy}
          onPress={() => void change()}
        />
      </Card>
      <Button
        label="Sign out"
        secondary
        onPress={() => void session.logout()}
      />
    </>
  );
}
function Dashboard() {
  const { state, session } = useMobile();
  const identity = state.identity!;
  const selected = identity.schools.find((s) => s.id === state.schoolId);
  const logo = state.workspace?.schoolSettings?.logoDataUri;
  return (
    <>
      <View style={styles.row}>
        {logo ? (
          <Image
            accessibilityLabel="School logo"
            source={{ uri: logo }}
            style={{ width: 54, height: 54, borderRadius: 15 }}
          />
        ) : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Copy large>{selected?.name || "Your workspace"}</Copy>
          <Copy muted>
            {identity.user.name} · {identity.user.role}
          </Copy>
        </View>
      </View>
      {identity.mode === "demo" ? (
        <Copy muted>Demo workspace · temporary test data</Copy>
      ) : null}
      {identity.schools.length > 1 ? (
        <Card>
          <Copy>Choose your school</Copy>
          {identity.schools.map((s) => (
            <Button
              key={s.id}
              label={`${s.id === state.schoolId ? "✓ " : ""}${s.name}`}
              secondary={s.id !== state.schoolId}
              onPress={() => void session.selectSchool(s.id)}
            />
          ))}
        </Card>
      ) : null}
      <ErrorText message={state.error} />
      {state.busy ? <Busy /> : null}
      {state.error && state.schoolId ? (
        <Button
          label="Retry school connection"
          onPress={() => void session.selectSchool(state.schoolId)}
        />
      ) : null}
      {identity.user.role === "owner" ? (
        <Card>
          <Copy large>Platform management</Copy>
          <Copy muted>
            Continue onboarding and owner support in the website. School mobile
            workflows are being built separately.
          </Copy>
        </Card>
      ) : state.workspace ? (
        <>
          <Card>
            <Copy large>A clearer school day.</Copy>
            <Copy muted>
              Your account and school connection are ready. Open your daily
              school views below. Additional staff workflows are coming next.
            </Copy>
          </Card>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Card>
                <Copy large>{state.workspace.classes?.length ?? 0}</Copy>
                <Copy muted>Accessible classes</Copy>
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card>
                <Copy large>{state.workspace.notices?.length ?? 0}</Copy>
                <Copy muted>Visible notices</Copy>
              </Card>
            </View>
          </View>
          <DailyMenu />
        </>
      ) : !state.busy && !state.error ? (
        <Card>
          <Copy muted>
            No school workspace is available. Ask your administrator to review
            your school access.
          </Copy>
        </Card>
      ) : null}
      <Button
        label="Account & appearance"
        secondary
        onPress={() => router.push("/settings")}
      />
      <Button
        label="Sign out"
        secondary
        onPress={() => void session.logout()}
      />
      <Copy muted>Powered by Schoolglass Desk</Copy>
    </>
  );
}
export default function Home() {
  const { state, session, colors } = useMobile();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={
            state.status === "ready" ? (
              <RefreshControl
                refreshing={false}
                tintColor={colors.accent}
                onRefresh={() => void session.restore()}
              />
            ) : undefined
          }
        >
          <View style={styles.row}>
            <Copy muted>SCHOOLGLASS DESK</Copy>
          </View>
          {state.status === "restoring" ? (
            <>
              <Busy />
              <Copy>{state.activity || "Checking your session…"}</Copy>
            </>
          ) : state.status === "locked" ? (
            <>
              <Copy large>Connection paused</Copy>
              <ErrorText message={state.error} />
              <Button
                label="Retry session check"
                onPress={() => void session.restore()}
              />
              <Button
                label="Sign out on this device"
                secondary
                onPress={() => void session.logout()}
              />
            </>
          ) : state.status === "signedOut" ? (
            <SignIn />
          ) : state.identity?.user.passwordChangeRequired ? (
            <PasswordChange />
          ) : (
            <Dashboard />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: 22,
    gap: 22,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingBottom: 40,
  },
  row: { flexDirection: "row", gap: 14, alignItems: "center" },
});
