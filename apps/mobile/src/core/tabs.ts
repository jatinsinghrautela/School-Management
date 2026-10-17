export const tabIds = ["home", "day", "services", "profile"] as const;
export type TabId = (typeof tabIds)[number];
export function tabForPath(path: string, origin?: string): TabId {
  if (path.startsWith("/service/"))
    return tabIds.includes(origin as TabId) ? (origin as TabId) : "services";
  if (path === "/profile" || path === "/settings") return "profile";
  if (path === "/services") return "services";
  if (path === "/school-day" || path === "/work" || path.startsWith("/daily/"))
    return "day";
  return "home";
}
