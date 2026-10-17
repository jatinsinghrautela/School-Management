import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMobile } from "../provider";
import { localDate, parseDate } from "../core/dates";
import {
  eventsOn,
  monthDays,
  monthEvents,
  type CalendarEntry,
} from "../core/calendar";
import { Button, Card, Copy } from "./ui";
import { Icon } from "./icon";
export function MonthCalendar({ entries }: { entries: CalendarEntry[] }) {
  const { colors, dark } = useMobile();
  const today = localDate(),
    now = new Date();
  const [month, setMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1, 12),
  );
  const [selected, setSelected] = useState(today);
  const cells = monthDays(month.getFullYear(), month.getMonth());
  while (cells.length % 7) cells.push(null);
  const holidays = monthEvents(
    entries,
    month.getFullYear(),
    month.getMonth(),
  ).filter((e) => e.kind === "holiday");
  const details = selected ? eventsOn(entries, selected) : [];
  const holidayFill = dark ? "#493343" : "#f9e4e8",
    holidayInk = dark ? "#ffd5df" : "#8e243e";
  const title = month.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  function move(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1, 12));
    setSelected("");
  }
  return (
    <>
      <Card>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => move(-1)}
            style={{ padding: 10, minHeight: 44 }}
          >
            <Icon name="back" color={colors.accent} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{
              flex: 1,
              textAlign: "center",
              color: colors.ink,
              fontSize: 18,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => move(1)}
            style={{ padding: 10, minHeight: 44 }}
          >
            <Icon name="arrow" color={colors.accent} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text
              key={d}
              style={{
                flex: 1,
                textAlign: "center",
                color: colors.muted,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              {d}
            </Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, week) => (
          <View key={week} style={{ flexDirection: "row", gap: 2 }}>
            {cells.slice(week * 7, week * 7 + 7).map((date, i) => {
              const items = date ? eventsOn(entries, date) : [],
                holiday = items.some((e) => e.kind === "holiday"),
                current = date === today,
                picked = date === selected;
              return date ? (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={`${date}${current ? ", Today" : ""}${holiday ? ", Holiday" : ""}${items.length ? `, ${items.length} events` : ""}`}
                  accessibilityState={{ selected: picked }}
                  onPress={() => setSelected(date)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 13,
                    borderWidth: picked ? 2 : current ? 1.5 : 0,
                    borderColor: picked
                      ? colors.accent
                      : current
                        ? colors.ink
                        : "transparent",
                    backgroundColor: holiday
                      ? holidayFill
                      : picked
                        ? colors.bg
                        : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                  }}
                >
                  <Text
                    style={{
                      color: holiday ? holidayInk : colors.ink,
                      fontWeight: current || picked ? "800" : "500",
                      fontSize: 14,
                    }}
                  >
                    {Number(date.slice(-2))}
                  </Text>
                  {!!items.length && (
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: holiday ? holidayInk : colors.accent,
                      }}
                    />
                  )}
                </Pressable>
              ) : (
                <View key={`empty-${i}`} style={{ flex: 1 }} />
              );
            })}
          </View>
        ))}
        <Copy muted>Legend</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {[
            { label: "Today", color: colors.ink, outline: true },
            { label: "Selected", color: colors.accent, outline: true },
            { label: "Holiday", color: holidayInk },
            { label: "Event", color: colors.accent },
          ].map((l) => (
            <View
              key={l.label}
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 4,
                  borderWidth: l.outline ? 1.5 : 0,
                  borderColor: l.color,
                  backgroundColor: l.outline ? "transparent" : l.color,
                }}
              />
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {l.label}
              </Text>
            </View>
          ))}
        </View>
        <Button
          label="Go to today"
          secondary
          onPress={() => {
            setMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12));
            setSelected(today);
          }}
        />
      </Card>
      {selected ? (
        <Card>
          <Copy large>
            {parseDate(selected)?.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </Copy>
          {details.length ? (
            details.map((e) => (
              <View key={e.id} style={{ gap: 5 }}>
                <Copy>{e.title}</Copy>
                <Copy muted>
                  {e.description ||
                    (e.kind === "holiday"
                      ? "School holiday."
                      : "School event.")}
                </Copy>
              </View>
            ))
          ) : (
            <Copy muted>No holidays or events scheduled for this date.</Copy>
          )}
        </Card>
      ) : (
        <Copy muted>Select a date to see its details.</Copy>
      )}
      <Copy large>
        Holidays in {month.toLocaleDateString(undefined, { month: "long" })}
      </Copy>
      {holidays.length ? (
        holidays.map((e) => (
          <Card key={e.id}>
            <Copy>{e.title}</Copy>
            <Copy muted>
              {e.startDate}
              {e.endDate !== e.startDate ? ` – ${e.endDate}` : ""}
            </Copy>
            {e.description ? <Copy>{e.description}</Copy> : null}
          </Card>
        ))
      ) : (
        <Copy muted>No school holidays published for this month.</Copy>
      )}
    </>
  );
}
