import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL ?? "",
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "",
  ].filter(Boolean),
});
