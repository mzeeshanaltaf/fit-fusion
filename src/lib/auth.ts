import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { callN8nWebhook } from "@/lib/n8n";
import { N8N_WEBHOOKS } from "@/lib/constants";
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
    // No transactional email provider is configured yet, so email
    // verification and password reset are intentionally left off.
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
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
