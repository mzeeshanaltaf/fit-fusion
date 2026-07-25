import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { Pool } from "pg";
import { callN8nWebhook } from "@/lib/n8n";
import { N8N_WEBHOOKS } from "@/lib/constants";
import { sendOtpEmail } from "@/lib/email";
import type { SignupCreditsResponse } from "@/lib/types";

/**
 * Better Auth server configuration.
 *
 * Tables (user, session, account, verification) live in the `fit_fusion`
 * Postgres schema — set via the connection `search_path` so both the CLI
 * migration and runtime queries target that schema. Create it once with:
 *   CREATE SCHEMA IF NOT EXISTS fit_fusion;
 */
export const auth = betterAuth({
  appName: "FitFusion",
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c search_path=fit_fusion",
  }),
  emailAndPassword: {
    enabled: true,
    // Sign-up creates the account but issues NO session until the emailed
    // code is entered — this is what stops throwaway addresses from claiming
    // signup credits. Existing accounts with emailVerified = false get walked
    // through the same flow on their next sign-in.
    requireEmailVerification: true,
  },
  emailVerification: {
    // An unverified sign-in attempt gets a fresh code first, so there's always
    // one waiting by the time we redirect to /verify-email.
    sendOnSignIn: true,
    // Verifying the code issues the session, so the user lands on the
    // dashboard instead of being bounced back to sign in.
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    // Google accounts arrive pre-verified and never see the OTP flow.
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    emailOTP({
      // Replaces Better Auth's link-based verification email with the OTP
      // sender, so sign-up and unverified sign-in both emit a 6-digit code.
      overrideDefaultEmailVerification: true,
      // Closes the passwordless /sign-in/email-otp route, which would
      // otherwise create nameless, passwordless accounts for unknown emails.
      disableSignUp: true,
      otpLength: 6,
      expiresIn: 600, // 10 minutes — keep in sync with the email copy
      allowedAttempts: 3,
      storeOTP: "hashed", // a DB leak shouldn't hand over live codes
      rateLimit: { window: 60, max: 3 },
      sendVerificationOTP: async ({ email, otp, type }) => {
        // Only the two flows the app actually exposes, so an unused endpoint
        // can't quietly mail users.
        if (type !== "email-verification" && type !== "forget-password") return;
        await sendOtpEmail(email, otp, type);
      },
    }),
  ],
  trustedOrigins: [
    "http://localhost:3000",
    "https://fitfusion.zeeshanai.cloud",
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  databaseHooks: {
    user: {
      create: {
        // Assign signup credits via n8n on registration — replaces the
        // former Clerk `user.created` webhook.
        after: async (user) => {
          try {
            await callN8nWebhook<SignupCreditsResponse>(N8N_WEBHOOKS.CREDITS, {
              event_type: "signup_credits",
              user_id: user.id,
            });
          } catch (error) {
            console.error("Failed to assign signup credits:", error);
          }
        },
      },
    },
  },
});
