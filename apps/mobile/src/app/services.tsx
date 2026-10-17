import { featuresFor } from "../core/features";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMobile } from "../provider";
import { useSchoolData } from "../daily-provider";
import { shareArtifact } from "../artifacts";
import type { Artifact } from "../core/daily";
import { Busy, Button, Copy, ErrorText } from "../components/ui";
import {
  Form,
  Pick,
  Records,
  choices,
  list,
  value,
  useAlive,
  type Row,
  type Input,
} from "../components/workflow";
const leaders = ["admin", "principal", "director"];
const encode = encodeURIComponent;
function Content({ tab }: { tab: string }) {
  const { session, state } = useMobile();
  const alive = useAlive();
  const manager = leaders.includes(state.identity!.user.role);
  const path =
    tab === "Messages"
      ? "/messages"
      : tab === "Privacy"
        ? "/privacy"
        : tab === "Fees"
          ? "/fees"
          : tab === "Student records"
            ? "/student-records"
            : tab === "Inbox"
              ? "/inbox"
              : "/operations";
  const remote = useSchoolData<Record<string, unknown>>(path);
  const rows = (key: string) => list(remote.data?.[key]);
  const options = (items: Row[], field = "name") =>
    items.map((r) => ({
      id: r.id,
      name:
        value(r, field) ||
        value(r, "studentName") ||
        value(r, "subject") ||
        "Record",
    }));
  const select = (
    key: string,
    label: string,
    items: Row[],
    field = "name",
  ): Input => ({ key, label, choices: options(items, field) });
  const reason = { key: "reason", label: "Reason (5-500 characters)" };
  const act = (
    title: string,
    fields: Input[],
    destination: string | ((d: Record<string, string>) => string),
    body: (d: Record<string, string>) => unknown = (d) => d,
  ) => (
    <Form
      key={title}
      title={title}
      fields={fields}
      submit={(d) =>
        session.school(
          typeof destination === "string" ? destination : destination(d),
          body(d),
        )
      }
      done={remote.refresh}
    />
  );
  const records = (key: string, fields: string[]) => (
    <Records rows={rows(key)} fields={fields} />
  );
  const share = (
    title: string,
    items: Row[],
    field: string,
    destination: (id: string) => string,
  ) => (
    <Form
      title={title}
      fields={[select("id", "Document", items, field)]}
      submit={async (d) => {
        const scope = session.scope();
        const artifact = await session.school<Artifact>(destination(d.id));
        await shareArtifact(
          artifact,
          () => alive() && scope === session.scope(),
        );
      }}
    />
  );
  return (
    <>
      {remote.loading ? <Busy /> : null}
      <ErrorText message={remote.error} />
      <Button
        label="Refresh service records"
        secondary
        onPress={remote.refresh}
      />
      {tab === "Inbox" ? (
        <>
          {records("items", ["title", "body", "createdAt", "readAt"])}
          {act(
            "Mark an inbox item as read",
            [
              select(
                "id",
                "Unread item",
                rows("items").filter((r) => !r.readAt),
                "title",
              ),
            ],
            "/inbox/read",
            (d) => ({ id: d.id }),
          )}
        </>
      ) : tab === "Student records" ? (
        <>
          <Records
            rows={rows("students").map((r) => ({
              ...r,
              ...rows("profiles").find((p) => p.studentId === r.id),
              id: r.id,
            }))}
            fields={[
              "name",
              "email",
              "admissionNumber",
              "birthDate",
              "address",
            ]}
          />
          <Copy large>Guardian records</Copy>
          {records("guardians", ["name", "email", "phone", "relationship"])}
        </>
      ) : tab === "Privacy" ? (
        <>
          <Copy large>School privacy policy</Copy>
          <Records
            rows={
              remote.data?.policy
                ? [{ ...(remote.data.policy as Row), id: "policy" }]
                : []
            }
            fields={["contactEmail", "notice", "retention", "version"]}
          />
          <Form
            title="Export my personal records"
            fields={[
              {
                key: "currentPassword",
                label: "Confirm current password",
                secure: true,
              },
            ]}
            submit={async (d) => {
              const scope = session.scope();
              const data = await session.school("/privacy/export", {
                currentPassword: d.currentPassword,
              });
              const escaped = JSON.stringify(data, null, 2)
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;");
              await shareArtifact(
                {
                  filename: "schoolglass-personal-records.html",
                  html: `<html><head><meta charset="utf-8"><title>Personal records</title></head><body><pre>${escaped}</pre></body></html>`,
                },
                () => alive() && scope === session.scope(),
              );
            }}
          />
          {act(
            "Request a privacy review",
            [
              {
                key: "type",
                label: "Request",
                choices: choices("access", "correction", "deletion"),
              },
              { key: "details", label: "Details (at least 5 characters)" },
            ],
            "/privacy/requests",
          )}
          {records("requests", ["subject", "description", "status"])}
        </>
      ) : tab === "Messages" ? (
        <>
          {act(
            "Message a teacher or guardian",
            [
              {
                key: "peer",
                label: "Recipient and student",
                choices: rows("peers").map((r, i) => ({
                  id: String(i),
                  name: `${r.name} - ${r.studentName}`,
                })),
              },
              { key: "body", label: "Message (up to 2000 characters)" },
            ],
            "/messages",
            (d) => {
              const peer = rows("peers")[Number(d.peer)];
              return {
                toId: peer.userId,
                studentId: peer.studentId,
                body: d.body,
                requestKey: d.requestKey,
              };
            },
          )}
          {records("messages", [
            "fromName",
            "toName",
            "studentName",
            "body",
            "createdAt",
          ])}
        </>
      ) : tab === "Library & transport" ? (
        <>
          <Copy large>Library catalogue</Copy>
          {records("books", ["title", "author", "isbn", "available"])}
          <Copy large>Visible loans</Copy>
          {records("loans", ["bookTitle", "borrowerName", "dueDate", "status"])}
          {manager ? (
            <>
              {act(
                "Issue a library book",
                [
                  select(
                    "bookId",
                    "Available book",
                    rows("books").filter(
                      (r) => r.active && Number(r.available) > 0,
                    ),
                    "title",
                  ),
                  select(
                    "userId",
                    "Borrower",
                    rows("people").filter((r) => r.active),
                  ),
                  { key: "dueDate", label: "Due date YYYY-MM-DD" },
                ],
                "/library/loans",
              )}
              {act(
                "Return a library book",
                [
                  select(
                    "id",
                    "Open loan",
                    rows("loans")
                      .filter((r) => r.status === "open")
                      .map((r) => ({
                        ...r,
                        name: `${r.bookTitle} - ${r.borrowerName}`,
                      })),
                  ),
                  reason,
                ],
                (d) => `/library/loans/${encode(d.id)}/return`,
              )}
            </>
          ) : null}
          <Copy large>School transport</Copy>
          <Records
            rows={rows("assignments")
              .filter((r) => r.active)
              .map((r) => ({
                ...rows("routes").find((route) => route.id === r.routeId),
                ...r,
              }))}
            fields={["studentName", "name", "vehicle", "pickupStop"]}
          />
          <Copy large>Assigned assets</Copy>
          {records("assets", ["name", "code", "status", "condition"])}
        </>
      ) : tab === "Support" ? (
        <>
          {act(
            "Raise a support ticket",
            [
              { key: "subject", label: "Subject" },
              { key: "description", label: "Describe the problem" },
              {
                key: "category",
                label: "Category",
                choices: choices("technical", "facilities", "other"),
              },
            ],
            "/tickets",
          )}
          {records("tickets", [
            "subject",
            "description",
            "requesterName",
            "category",
            "status",
          ])}
          {manager
            ? act(
                "Update support ticket",
                [
                  select("id", "Ticket", rows("tickets"), "subject"),
                  {
                    key: "status",
                    label: "Status",
                    choices: choices(
                      "open",
                      "in-progress",
                      "resolved",
                      "closed",
                    ),
                  },
                  reason,
                ],
                (d) => `/tickets/${encode(d.id)}/status`,
                (d) => ({
                  ...d,
                  version: rows("tickets").find((r) => r.id === d.id)?.version,
                }),
              )
            : null}
        </>
      ) : tab === "Documents" ? (
        <>
          {act(
            "Request a school document",
            [
              select(
                "studentId",
                "Student",
                manager
                  ? rows("people").filter((r) => r.role === "student")
                  : rows("children"),
              ),
              {
                key: "type",
                label: "Document",
                choices: choices(
                  "bonafide",
                  "transfer",
                  "certificate",
                  "other",
                ),
              },
              { key: "details", label: "Request details" },
            ],
            "/document-requests",
          )}
          {records("documents", [
            "studentName",
            "type",
            "details",
            "reference",
            "status",
          ])}
          {share(
            "Share an issued document",
            rows("documents").filter((r) =>
              ["ready", "collected"].includes(value(r, "status")),
            ),
            "studentName",
            (id) => `/document-requests/${encode(id)}/download`,
          )}
          {manager
            ? act(
                "Review a document request",
                [
                  select(
                    "id",
                    "Request",
                    rows("documents").filter((r) =>
                      ["requested", "ready"].includes(value(r, "status")),
                    ),
                    "studentName",
                  ),
                  {
                    key: "status",
                    label: "Decision",
                    choices: choices(
                      "ready",
                      "rejected",
                      "collected",
                      "cancelled",
                    ),
                  },
                  reason,
                  {
                    key: "reference",
                    label: "Reference (required when ready)",
                    optional: true,
                  },
                  {
                    key: "content",
                    label: "School-approved text (required when ready)",
                    optional: true,
                  },
                ],
                (d) => `/document-requests/${encode(d.id)}/decision`,
                (d) => ({
                  ...d,
                  version: rows("documents").find((r) => r.id === d.id)
                    ?.version,
                }),
              )
            : null}
        </>
      ) : tab === "Visitors" ? (
        <>
          {act(
            "Check in a visitor",
            [
              { key: "name", label: "Visitor name" },
              { key: "purpose", label: "Visit purpose" },
              select(
                "hostId",
                "Host",
                rows("people").filter((r) => r.active && r.role !== "student"),
              ),
            ],
            "/visitors",
          )}
          {records("visitors", [
            "name",
            "hostName",
            "purpose",
            "status",
            "checkedInAt",
            "checkedOutAt",
          ])}
          {act(
            "Check out a visitor",
            [
              select(
                "id",
                "Visitor",
                rows("visitors").filter((r) => r.status === "checked-in"),
              ),
            ],
            (d) => `/visitors/${encode(d.id)}/checkout`,
          )}
        </>
      ) : tab === "Fees" ? (
        <>
          <Records
            rows={rows("charges").map((r) => ({
              ...r,
              studentName: list(state.workspace?.users).find(
                (u) => u.id === r.studentId,
              )?.name,
            }))}
            fields={[
              "studentName",
              "name",
              "currency",
              "amountMinor",
              "outstandingMinor",
              "dueDate",
            ]}
          />
          <Copy muted>
            Amounts use minor units: INR 10000 = INR 100. These record payments
            already collected by the school; the app does not process money.
          </Copy>
          {act(
            "Record a collected payment",
            [
              select(
                "id",
                "Charge",
                rows("charges").map((r) => ({
                  ...r,
                  label: `${list(state.workspace?.users).find((u) => u.id === r.studentId)?.name} - ${r.name} - ${r.outstandingMinor} minor units`,
                })),
                "label",
              ),
              {
                key: "amountMinor",
                label: "Amount in minor units",
                numeric: true,
              },
              { key: "paidOn", label: "Payment date YYYY-MM-DD" },
              {
                key: "method",
                label: "Method",
                choices: choices("cash", "bank", "cheque"),
              },
              {
                key: "reference",
                label: "Reference (required for bank or cheque)",
                optional: true,
              },
            ],
            (d) => `/fee-charges/${encode(d.id)}/payments`,
            (d) => ({ ...d, amountMinor: Number(d.amountMinor) }),
          )}
          {records("payments", [
            "receiptNumber",
            "amountMinor",
            "paidOn",
            "method",
            "voided",
          ])}
          {share(
            "Share a payment receipt",
            rows("payments"),
            "receiptNumber",
            (id) => `/fee-payments/${encode(id)}/receipt`,
          )}
          {act(
            "Record a fee concession",
            [
              select("id", "Charge", rows("charges")),
              {
                key: "amountMinor",
                label: "Concession in minor units",
                numeric: true,
              },
              reason,
            ],
            (d) => `/fee-charges/${encode(d.id)}/concessions`,
            (d) => ({ ...d, amountMinor: Number(d.amountMinor) }),
          )}
          {act(
            "Void a payment",
            [
              select(
                "id",
                "Payment",
                rows("payments").filter((r) => !r.voided),
                "receiptNumber",
              ),
              reason,
            ],
            (d) => `/fee-payments/${encode(d.id)}/void`,
          )}
        </>
      ) : null}
    </>
  );
}
function SchoolServices({ initialTab }: { initialTab?: string }) {
  const { state, session, colors } = useMobile();
  const [tab, setTab] = useState(initialTab || "Library & transport");
  const role = state.identity?.user.role || "";
  if (
    state.status !== "ready" ||
    state.identity?.user.passwordChangeRequired ||
    role === "owner"
  )
    return <Redirect href="/" />;
  const tabs = [
    "Library & transport",
    "Inbox",
    "Support",
    "Privacy",
    ...(leaders.includes(role)
      ? ["Visitors", "Fees", "Student records"]
      : role === "student"
        ? ["Student records"]
        : []),
    ...(["student", "parent", ...leaders].includes(role) ? ["Documents"] : []),
    ...(["teacher", "parent", ...leaders].includes(role) ? ["Messages"] : []),
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 22,
          gap: 20,
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
          paddingBottom: 120,
        }}
      >
        <Button
          label="Back to overview"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
        />
        <Copy large>School services</Copy>
        <Copy muted>{state.workspace?.school.name}</Copy>
        <Pick
          label="Service"
          selected={tab}
          options={choices(...tabs)}
          onChange={setTab}
        />
        <Content key={`${session.scope()}:${tab}`} tab={tab} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Route() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { state } = useMobile();
  const selected = featuresFor(state.identity?.user.role || "").find(
    (f) => f.screen === "services" && f.section === section,
  )?.section;
  return <SchoolServices key={selected || "default"} initialTab={selected} />;
}
