import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { needsSchoolChoice } from "../core/session";
import { api, endpoint, useMobile } from "../provider";
import { Busy, Button, Card, Copy, ErrorText, Field } from "../components/ui";
import { BrandMark } from "../components/hero";
import { Dashboard } from "../components/dashboard";
function SignIn() {
  const { session, state, colors } = useMobile();
  const { height } = useWindowDimensions();
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
      <View style={{ gap: 8, alignItems: "center" }}>
        {height > 700 ? (
          <View
            style={{
              padding: 10,
              borderRadius: 19,
              backgroundColor: colors.hero,
            }}
          >
            <BrandMark />
          </View>
        ) : null}
        <Text
          style={{
            color: colors.ink,
            fontSize: height > 700 ? 28 : 23,
            lineHeight: 32,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          A brighter school day.
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            lineHeight: 19,
            textAlign: "center",
          }}
        >
          Sign in with your school account.
        </Text>
      </View>
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
          busy={state.busy}
          disabled={state.busy || sending || !email.trim() || !password}
          onPress={() => {
            void session.login(email, password);
            setPassword("");
          }}
        />
        <Button
          label="Request password reset"
          busy={sending}
          secondary
          disabled={state.busy || sending || !email.trim()}
          onPress={() => void reset()}
        />
        {message ? <Copy>{message}</Copy> : null}
      </Card>
      <Text
        style={{
          color: colors.muted,
          fontSize: 11,
          lineHeight: 16,
          textAlign: "center",
        }}
      >
        Powered by Schoolglass Desk · {new URL(endpoint).host}
      </Text>
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
          busy={busy}
          disabled={busy}
          onPress={() => void change()}
        />
      </Card>
    </>
  );
}
export default function Home() {
  const { state, session, colors } = useMobile();
  const [viewport, setViewport] = useState(0),
    [content, setContent] = useState(0);
  const login = state.status === "signedOut";
  if (needsSchoolChoice(state)) return <Redirect href="/choose-school" />;
  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          onLayout={(event) => setViewport(event.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContent(h)}
          scrollEnabled={!login || !viewport || content > viewport + 2}
          bounces={!login}
          showsVerticalScrollIndicator={!login}
          contentContainerStyle={[
            styles.content,
            login && {
              paddingBottom: 16,
              paddingTop: 12,
              gap: 12,
              flexGrow: 1,
              justifyContent: "center",
            },
          ]}
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
            <>
              <SignIn />
            </>
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
    padding: 18,
    gap: 18,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingBottom: 120,
  },
});
