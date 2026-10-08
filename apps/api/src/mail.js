import nodemailer from "nodemailer";
export function configuredMailer(env = process.env) {
  if (
    !env.SMTP_HOST ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD ||
    !env.SMTP_FROM ||
    !env.PUBLIC_APP_URL
  )
    return null;
  const url = new URL(env.PUBLIC_APP_URL);
  if (
    url.protocol !== "https:" &&
    !(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.protocol === "http:"
    )
  )
    throw new Error("PUBLIC_APP_URL must use HTTPS");
  const port = Number(env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return async (user, token, invitation = false) =>
    transport.sendMail({
      from: env.SMTP_FROM,
      to: user.email,
      subject: invitation
        ? "Your Schoolglass Desk invitation"
        : "Reset your Schoolglass Desk password",
      text: `${invitation ? "Your administrator has provided an account." : "A password reset was requested."}\nOpen ${url.origin}${url.pathname}#reset=${token}\nThis link expires in 15 minutes. Set your own password. If you did not expect this message, contact your school.`,
    });
}
