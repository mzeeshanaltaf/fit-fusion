import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// Note the import-path split: the server plugin comes from `better-auth/plugins`,
// the client one from `better-auth/client/plugins`.
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession, emailOtp } = authClient;
