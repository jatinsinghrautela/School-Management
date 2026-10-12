export function deploymentCheck(
  env = process.env,
  { production = env.NODE_ENV === "production" } = {},
) {
  const errors = [],
    warnings = [];
  const render = env.DEPLOYMENT_PROFILE === "render";
  const issue = (condition, message) => {
    if (!condition) errors.push(message);
  };
  issue(
    /^\d+$/.test(String(env.PORT || 4000)) &&
      Number(env.PORT || 4000) > 0 &&
      Number(env.PORT || 4000) <= 65535,
    "PORT must be an integer from 1 to 65535",
  );
  issue(
    ["mysql", "demo"].includes(env.DATA_MODE || "mysql"),
    "DATA_MODE must be mysql or demo",
  );
  const fields = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"];
  const configured = fields.filter((key) => Boolean(env[key]));
  issue(
    configured.length === 0 ||
      (configured.length === fields.length && Boolean(env.PUBLIC_APP_URL)),
    "SMTP configuration is incomplete; configure all required fields or leave delivery disabled",
  );
  let url;
  if (env.PUBLIC_APP_URL) {
    try {
      url = new URL(env.PUBLIC_APP_URL);
    } catch {}
    issue(
      Boolean(
        url &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === "/" &&
        ["https:", "http:"].includes(url.protocol),
      ),
      "PUBLIC_APP_URL must be an HTTP(S) origin without credentials, a path, query or fragment",
    );
  }
  if (url)
    issue(
      url.protocol === "https:" ||
        ["localhost", "127.0.0.1"].includes(url.hostname),
      "PUBLIC_APP_URL must use HTTPS outside the local preview",
    );
  if (configured.length)
    issue(
      /^\d+$/.test(String(env.SMTP_PORT || 587)) &&
        Number(env.SMTP_PORT || 587) > 0 &&
        Number(env.SMTP_PORT || 587) <= 65535,
      "SMTP_PORT must be an integer from 1 to 65535",
    );
  if (production) {
    if (render) {
      issue(
        env.RENDER === "true",
        "Render profile requires the platform RENDER marker",
      );
      issue(
        env.MYSQL_TLS === "required" && !!env.MYSQL_CA_FILE,
        "Render requires verified MySQL TLS and MYSQL_CA_FILE",
      );
      issue(
        env.FILE_STORAGE === "r2",
        "Render requires persistent R2 file storage",
      );
      issue(
        env.TRUST_PROXY === "1",
        "Render requires exactly one trusted proxy hop",
      );
      issue(env.HOST === "0.0.0.0", "Render requires HOST=0.0.0.0");
    }
    issue(
      env.NODE_ENV === "production",
      "Set NODE_ENV=production for the production process",
    );
    issue(env.DATA_MODE === "mysql", "Production requires DATA_MODE=mysql");
    issue(
      render ||
        ["127.0.0.1", "::1", "localhost"].includes(env.HOST || "127.0.0.1"),
      "Production API must bind to loopback behind a local HTTPS reverse proxy",
    );
    issue(
      render || env.TRUST_PROXY === "loopback",
      "Production requires TRUST_PROXY=loopback; the local reverse proxy must overwrite forwarded headers",
    );
    issue(
      Boolean(url && url.protocol === "https:"),
      "Production requires an HTTPS PUBLIC_APP_URL",
    );
    issue(
      Boolean(
        env.MYSQL_USER &&
        !["root", "mysql"].includes(env.MYSQL_USER.toLowerCase()),
      ),
      "Use a dedicated restricted MYSQL_USER",
    );
    issue(
      Boolean(
        env.MYSQL_PASSWORD &&
        env.MYSQL_PASSWORD.length >= 20 &&
        ![
          "local-development-only",
          "local-root-development-only",
          "synthetic-ci-app-only",
          "synthetic-ci-root-only",
        ].includes(env.MYSQL_PASSWORD),
      ),
      "Configure a non-default MYSQL_PASSWORD of at least 20 characters",
    );
    issue(
      env.MYSQL_AUTO_MIGRATE === "no",
      "Set MYSQL_AUTO_MIGRATE=no after separate migration initialization",
    );
    issue(
      !env.BOOTSTRAP_PASSWORD,
      "Remove BOOTSTRAP_PASSWORD from the runtime process after initialization",
    );
    issue(
      !env.RESTORE_MYSQL_USER &&
        !env.RESTORE_MYSQL_PASSWORD &&
        !env.BACKUP_PASSPHRASE,
      "Recovery credentials and backup passphrases must not be present in the API runtime environment",
    );
  }
  issue(
    !env.FILE_STORAGE || ["local", "r2"].includes(env.FILE_STORAGE),
    "Invalid FILE_STORAGE",
  );
  if (env.FILE_STORAGE === "r2") {
    issue(
      /^https:\/\/[a-f0-9]{32}(?:\.eu|\.fedramp)?\.r2\.cloudflarestorage\.com\/?$/.test(
        env.R2_ENDPOINT || "",
      ),
      "Use the account HTTPS R2 S3 endpoint",
    );
    issue(
      !!env.R2_BUCKET && !!env.R2_ACCESS_KEY_ID && !!env.R2_SECRET_ACCESS_KEY,
      "R2 credentials and bucket are required",
    );
    for (const [name, maximum] of [
      ["R2_MAX_BYTES", 8000000000],
      ["R2_MAX_CLASS_A", 500000],
      ["R2_MAX_CLASS_B", 5000000],
    ]) {
      const value = Number(env[name] || maximum);
      issue(
        Number.isSafeInteger(value) && value > 0 && value <= maximum,
        `${name} must stay within the conservative free-tier budget`,
      );
    }
  }
  if (!configured.length)
    warnings.push("Email delivery is disabled until configured and tested");
  if (
    !["required", "disabled", "unscanned-local", "unscanned"].includes(
      env.UPLOAD_SCAN_MODE || "required",
    )
  )
    errors.push(
      "UPLOAD_SCAN_MODE must be required, disabled, unscanned-local or unscanned",
    );
  if (production && env.UPLOAD_SCAN_MODE === "unscanned-local")
    errors.push("Unscanned uploads are restricted to local development");
  if (
    env.UPLOAD_SCAN_MODE === "unscanned" ||
    (env.UPLOAD_SCAN_MODE === "unscanned-local" && !production)
  )
    warnings.push("Uploads are enabled WITHOUT malware scanning");
  else if (env.UPLOAD_SCAN_MODE === "disabled" || !env.CLAMAV_COMMAND)
    warnings.push(
      "File uploads are disabled until ClamAV is configured and tested",
    );
  return {
    profile: production ? "production" : "development",
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
export function requireDeployment(env = process.env) {
  const report = deploymentCheck(env);
  if (!report.valid)
    throw new Error(
      "Invalid deployment configuration: " + report.errors.join("; "),
    );
  return report;
}
