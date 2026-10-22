/** Check release configuration without printing credentials or calling the API. */
export function validatePilotConfig(app, eas, env = {}) {
  const errors = [];
  const expo = app.expo || {};
  const preview = eas.build?.preview;
  if (!expo.android?.package || !expo.ios?.bundleIdentifier)
    errors.push("Native application identifiers are missing.");
  if (!expo.icon) errors.push("Original application icon is missing.");
  if (
    preview?.android?.buildType !== "apk" ||
    preview?.distribution !== "internal"
  )
    errors.push("Preview must be an internally distributed Android APK.");
  const configured = preview?.env?.EXPO_PUBLIC_API_URL;
  try {
    const url = new URL(configured);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["", "/", "/api", "/api/"].includes(url.pathname)
    )
      throw Error();
  } catch {
    errors.push(
      "Preview API must be an HTTPS origin or /api URL without credentials or query parameters.",
    );
  }
  const publicKeys = new Set([
    ...Object.keys(env),
    ...Object.keys(preview?.env || {}),
  ]);
  if (
    [...publicKeys].some(
      (key) => key.startsWith("EXPO_PUBLIC_") && key !== "EXPO_PUBLIC_API_URL",
    )
  )
    errors.push(
      "Review unexpected public environment variable names before a build; only EXPO_PUBLIC_API_URL is approved.",
    );
  if (preview?.developmentClient)
    errors.push(
      "Standalone pilot must not require a development client or Metro.",
    );
  return {
    errors,
    projectIdConfigured:
      typeof expo.extra?.eas?.projectId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(expo.extra.eas.projectId),
  };
}
