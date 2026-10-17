import React from "react";
import { Image, ScrollView, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useMobile } from "../provider";
import { ChangePassword } from "../components/change-password";
import { Button, Card, Copy } from "../components/ui";
import { BrandMark } from "../components/hero";
import { list, value } from "../components/workflow";
export default function Profile() {
  const { state, session, dark, toggle } = useMobile();
  if (state.status !== "ready" || state.identity?.user.passwordChangeRequired)
    return <Redirect href="/" />;
  const user = state.identity!.user;
  const current = list(state.workspace?.users).find((u) => u.id === user.id);
  const logo = state.workspace?.schoolSettings?.logoDataUri;
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 22,
        gap: 20,
        maxWidth: 640,
        width: "100%",
        alignSelf: "center",
        paddingBottom: 120,
      }}
    >
      <Card>
        <View
          style={{
            alignSelf: "flex-start",
            padding: 12,
            borderRadius: 24,
            backgroundColor: "#2b6656",
          }}
        >
          {logo ? (
            <Image
              accessibilityLabel="School logo"
              source={{ uri: logo }}
              style={{ width: 48, height: 48, borderRadius: 12 }}
            />
          ) : (
            <BrandMark />
          )}
        </View>
        <Copy large>{user.name}</Copy>
        <Copy>{user.email}</Copy>
        <Copy muted>Role: {user.role}</Copy>
        <Copy muted>{state.workspace?.school.name || "Platform account"}</Copy>
        {current &&
          ["admissionNumber", "employeeNumber", "phone"].map((key) =>
            value(current, key) ? (
              <Copy key={key}>
                {key}: {value(current, key)}
              </Copy>
            ) : null,
          )}
        <Copy muted>
          Accessible classes:{" "}
          {list(state.workspace?.classes)
            .map((c) => value(c, "name"))
            .join(", ") || "None"}
        </Copy>
      </Card>
      {state.identity!.schools.length > 1 ? (
        <Card>
          <Copy>School access</Copy>
          {user.role === "director" ? (
            <Button
              label="Switch school"
              onPress={() => session.chooseAnotherSchool()}
            />
          ) : (
            state.identity!.schools.map((s) => (
              <Button
                key={s.id}
                label={s.name}
                secondary
                onPress={() => void session.selectSchool(s.id)}
              />
            ))
          )}
        </Card>
      ) : null}
      <Card>
        <Copy>Appearance</Copy>
        <Copy muted>
          Starts with your device theme. Your choice applies for this app
          session.
        </Copy>
        <Button
          label={dark ? "Switch to light mode" : "Switch to dark mode"}
          onPress={toggle}
        />
      </Card>
      <Card>
        <Copy>Account security</Copy>
        <Copy muted>
          Review your active sign-ins and sign out other devices.
        </Copy>
        <Button
          label="Active sessions"
          onPress={() =>
            router.push({
              pathname: "/service/[id]",
              params: { id: "active-sessions" },
            })
          }
        />
      </Card>
      <ChangePassword />
      <Copy muted>Powered by Schoolglass Desk</Copy>
    </ScrollView>
  );
}
