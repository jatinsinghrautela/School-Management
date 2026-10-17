export const leaders = ["admin", "principal", "director"];
export const employed = [...leaders, "teacher", "staff"];
export function dailySections(role: string) {
  if (["student", "parent"].includes(role))
    return [
      "notices",
      "learning",
      "timetable",
      "calendar",
      "attendance",
      "results",
      "fees",
      "gallery",
    ];
  return employed.includes(role)
    ? [
        "notices",
        "calendar",
        "gallery",
        ...(role === "staff" ? [] : ["learning"]),
      ]
    : [];
}
