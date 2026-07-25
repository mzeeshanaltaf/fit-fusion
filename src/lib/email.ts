import { Resend } from "resend";
import { OTP_SENDER_EMAIL } from "@/lib/constants";

/**
 * Server-only. The Resend API has no CORS support, so this module must never
 * be pulled into a "use client" tree.
 */
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * dotenv strips surrounding quotes from env values; Coolify/Docker pass the raw
 * string through. A value pasted as RESEND_FROM_EMAIL="FitFusion <a@b.c>" would
 * therefore reach production with literal quote characters, and Resend rejects
 * it with a 422 validation_error on the `from` field — a failure that local dev
 * cannot reproduce.
 */
function unquote(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, "$2")
    .trim();
}

const FROM = unquote(process.env.RESEND_FROM_EMAIL) || `FitFusion <${OTP_SENDER_EMAIL}>`;

const OTP_EXPIRY_MINUTES = 10; // keep in sync with emailOTP({ expiresIn }) in auth.ts

// Absolute URL for the logo: mail clients cannot fetch localhost and Gmail
// blocks data: URIs, so dev sends point at the production origin too.
const PUBLIC_URL = "https://fitfusion.zeeshanai.cloud";

export type OtpEmailType = "email-verification" | "forget-password";

const COPY = {
  "email-verification": {
    subject: "Verify your email",
    heading: "Verify your email",
    intro: "Enter this code to finish setting up your FitFusion account.",
    outro:
      "If you didn't create a FitFusion account, you can safely ignore this email.",
  },
  "forget-password": {
    subject: "Reset your password",
    heading: "Reset your password",
    intro: "Enter this code to choose a new password.",
    outro:
      "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
  },
} as const;

function otpTemplate(otp: string, type: OtpEmailType) {
  const { subject, heading, intro, outro } = COPY[type];

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your FitFusion code is ${otp}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
          <tr><td style="padding:32px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:10px;line-height:0;">
                <img src="${PUBLIC_URL}/apple-icon" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;border-radius:8px;" />
              </td>
              <td style="font-size:18px;font-weight:600;color:#0f172a;">FitFusion</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:24px 32px 0 32px;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">${heading}</h1>
            <p style="margin:8px 0 0 0;font-size:14px;line-height:22px;color:#475569;">${intro}</p>
          </td></tr>
          <tr><td style="padding:24px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;">
              <tr><td align="center" style="padding:20px 16px;">
                <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#0f172a;">${otp}</span>
              </td></tr>
            </table>
            <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          </td></tr>
          <tr><td style="padding:24px 32px 32px 32px;">
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px 0;" />
            <p style="margin:0;font-size:12px;line-height:20px;color:#94a3b8;">${outro}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    heading,
    "",
    intro,
    "",
    `Code: ${otp}`,
    `This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    "",
    outro,
  ].join("\n");

  return { subject, html, text };
}

export async function sendOtpEmail(email: string, otp: string, type: OtpEmailType) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set.");
  }

  const { subject, html, text } = otpTemplate(otp, type);

  // No idempotency key: every send carries a freshly rotated code, so a stable
  // key would 409 on the second send and "Resend code" must deliver a new one.
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [email],
    subject,
    html,
    text,
  });

  // The SDK resolves rather than throwing — failures arrive on `error`, so a
  // bare try/catch would silently swallow every API error.
  if (error) {
    throw new Error(`Resend send failed: ${error.name} — ${error.message}`);
  }

  return data;
}
