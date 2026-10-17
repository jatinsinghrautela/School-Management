import { Icon } from "./icon";
import React, { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useMobile } from "../provider";
import { featuresFor } from "../core/features";
import { useFeatureNavigation } from "./feature-navigation";
import { FeatureGrid } from "./feature-grid";
import { BrandMark, Hero } from "./hero";
import { ChildPicker } from "./daily-menu";
import { Busy, Button, Card, Copy, ErrorText } from "./ui";
export function Dashboard() {
  const { state, session, colors, dark } = useMobile();
  const open = useFeatureNavigation();
  const [query, setQuery] = useState("");
  const identity = state.identity!;
  const role = identity.user.role;
  const logo = state.workspace?.schoolSettings?.logoDataUri;
  const features = featuresFor(role);
  const staff = ["teacher", "admin", "principal", "director", "staff"].includes(
    role,
  );
  const quickLabels =
    role === "owner"
      ? [
          "Schools & organizations",
          "Leadership onboarding",
          "Platform KPIs & diagnostics",
          "Support impersonation",
        ]
      : staff && role !== "staff"
        ? ["Record attendance", "Exam marks", "Publish notices", "Staff leave"]
        : ["Timetable", "Homework & resources", "Notices", "Calendar"];
  const quick = quickLabels.flatMap((label) =>
    features.filter((f) => f.label === label),
  );
  const daily = features.filter((f) => f.screen === "daily");
  const firstNotice = (state.workspace?.notices || [])[0] as
    { title?: string; body?: string } | undefined;
  return (
    <>
      <View
        style={{
          padding: 16,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: dark ? "#203b38" : "#dcefe8",
          borderRadius: 24,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        {logo ? (
          <Image
            accessibilityLabel="School logo"
            source={{ uri: logo }}
            style={{ width: 43, height: 43, borderRadius: 14 }}
          />
        ) : (
          <View
            style={{ padding: 7, backgroundColor: "#2b6656", borderRadius: 14 }}
          >
            <BrandMark />
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 10, color: colors.muted }}>
            Welcome back · {identity.user.role}
          </Text>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 20,
              fontWeight: "800",
              color: colors.ink,
            }}
          >
            {identity.user.name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open inbox"
          onPress={() =>
            open(features.find((f) => f.label === "Inbox") || features[0])
          }
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="Inbox" color={colors.ink} size={22} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.navigate("/profile")}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 22,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="Profile" color={colors.ink} size={22} />
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface,
        }}
      >
        <TextInput
          accessibilityLabel="Search features"
          placeholder="Search your school…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={{
            flex: 1,
            minWidth: 0,
            color: colors.ink,
            paddingHorizontal: 20,
            minHeight: 48,
            fontSize: 14,
          }}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery("")}
            style={{
              minHeight: 44,
              minWidth: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="close" color={colors.muted} size={22} />
          </Pressable>
        ) : null}
      </View>
      {query.trim() ? (
        <Card>
          <Copy>Search results</Copy>
          <FeatureGrid
            features={features.filter((f) =>
              f.label.toLowerCase().includes(query.trim().toLowerCase()),
            )}
          />
          {!features.some((f) =>
            f.label.toLowerCase().includes(query.trim().toLowerCase()),
          ) ? (
            <Copy muted>No matching features.</Copy>
          ) : null}
        </Card>
      ) : (
        <>
          {identity.mode === "demo" ? (
            <Copy muted>Demo workspace · temporary test data</Copy>
          ) : null}
          <ChildPicker />
          <Card>
            <FeatureGrid features={quick} prefix="Quick action: " />
          </Card>
          <ErrorText message={state.error} />
          {state.busy ? <Busy /> : null}
          {state.error && state.schoolId ? (
            <Button
              label="Retry school connection"
              onPress={() => void session.selectSchool(state.schoolId)}
            />
          ) : null}
          {state.workspace || role === "owner" ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Copy>Your school day</Copy>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="See all features"
                  onPress={() => router.navigate("/services")}
                  style={{ padding: 10 }}
                >
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    See all ↗
                  </Text>
                </Pressable>
              </View>
              {daily.length ? (
                <Card>
                  <FeatureGrid features={daily} />
                </Card>
              ) : null}
              <Hero
                compact
                title="A clearer school day."
                detail="Your learning, people and plans. Connected in one place."
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Card>
                    <Copy large>{state.workspace?.classes?.length ?? 0}</Copy>
                    <Copy muted>Accessible classes</Copy>
                  </Card>
                </View>
                <View style={{ flex: 1 }}>
                  <Card>
                    <Copy large>{state.workspace?.notices?.length ?? 0}</Copy>
                    <Copy muted>Visible notices</Copy>
                  </Card>
                </View>
              </View>
              {firstNotice ? (
                <Card>
                  <Copy>Latest campus notice</Copy>
                  <Copy>{firstNotice.title}</Copy>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: colors.muted,
                      fontSize: 13,
                      lineHeight: 20,
                    }}
                  >
                    {firstNotice.body}
                  </Text>
                  <Button
                    label="View campus notices"
                    secondary
                    onPress={() =>
                      open(features.find((f) => f.label === "Notices")!)
                    }
                  />
                </Card>
              ) : null}
            </>
          ) : !state.busy && !state.error ? (
            <Card>
              <Copy muted>
                No school workspace is available. Ask your administrator to
                review your school access.
              </Copy>
            </Card>
          ) : null}
          {staff ? (
            <Button
              label="School workspace"
              secondary
              onPress={() => open(features.find((f) => f.screen === "work")!)}
            />
          ) : null}
          {role !== "owner" ? (
            <Button
              label="School services"
              secondary
              onPress={() => router.push("/services")}
            />
          ) : null}
          <Button
            label="Browse all services"
            secondary
            onPress={() => router.navigate("/services")}
          />
        </>
      )}
      <Copy muted>Powered by Schoolglass Desk</Copy>
    </>
  );
}
