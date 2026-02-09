import {
  type BetterAuthOptions,
  type BetterAuthPlugin,
  betterAuth,
} from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, emailOTP, openAPI, username } from "better-auth/plugins";
import { headers } from "next/headers";
import { cache } from "react";
import { IS_PROD } from "@/config/constants";
import { env } from "@/env";
import { db } from "@/server/db";

/**
 * Returns true when the email should use the fixed OTP in non-production.
 */
const isTestOtpEmail = (email: string) =>
  !IS_PROD && email.toLowerCase().includes("+test@");

/**
 * Builds a session object for auth-disabled mode.
 */
const buildAuthDisabledSession = (user: AuthUserType): Session => {
  const now = new Date();

  return {
    user,
    session: {
      id: "auth-disabled",
      token: "auth-disabled",
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      ipAddress: null,
      userAgent: null,
      userId: user.id,
      impersonatedBy: null,
    },
  };
};

/**
 * Returns the admin session when auth is disabled.
 */
const getAuthDisabledSession = async () => {
  const adminUser = await db.user.findFirst({
    where: {
      role: "admin",
    },
  });

  if (!adminUser) {
    throw new Error(
      "NEXT_PUBLIC_DISABLE_AUTH is true but no admin user exists. Run the seed to create it.",
    );
  }

  const safeUser = JSON.parse(JSON.stringify(adminUser)) as AuthUserType;

  return buildAuthDisabledSession(safeUser);
};

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  baseURL: env.NEXT_PUBLIC_APP_URL,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Update the user with default preferences
          await db.user.update({
            where: { id: user.id },
            data: {
              preferences: {},
            },
          });
        },
      },
    },
  },

  plugins: (() => {
    const plugins = [
      openAPI(), // /api/auth/reference
      admin({
        impersonationSessionDuration: 60 * 60 * 24 * 7, // 7 days
      }),
      username(),
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (isTestOtpEmail(email)) {
            console.info(
              `[auth] Using static OTP for ${email} (${type}) in non-production.`,
            );
            return;
          }

          // TODO: integrate with email provider. For now, log in dev to unblock OTP flow.
          console.info(`[auth] OTP for ${email} (${type}): ${otp}`);
        },
        generateOTP: ({ email }) =>
          isTestOtpEmail(email) ? "123456" : undefined,
        overrideDefaultEmailVerification: true,
      }),
    ] satisfies BetterAuthPlugin[];

    return plugins;
  })(),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      avatarImageUrl: {
        type: "string",
        required: false,
      },
      coverImageUrl: {
        type: "string",
        required: false,
      },
      timezone: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
      },
    },
    changeEmail: {
      enabled: false,
    },
  },
  //this is disabled in dev by default, but you can force enable it with "enabled"
  rateLimit: {
    window: 60,
    max: 100,
  },
  socialProviders: {
    github: env.GITHUB_CLIENT_ID
      ? {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          redirectURI: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`,
        }
      : undefined,
    google: env.GOOGLE_CLIENT_ID
      ? {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectURI: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
        }
      : undefined,
    apple: env.APPLE_CLIENT_ID
      ? {
          clientId: env.APPLE_CLIENT_ID,
          clientSecret: env.APPLE_CLIENT_SECRET,
          redirectURI: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/apple`,
        }
      : undefined,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github", "google", "apple"],
    },
  },
  emailAndPassword: {
    enabled: false,
  },
} satisfies BetterAuthOptions);

export const getServerSession = cache(async () =>
  env.NEXT_PUBLIC_DISABLE_AUTH
    ? await getAuthDisabledSession()
    : await auth.api.getSession({
        headers: await headers(),
      }),
);

/**
 * Returns a session for request-based contexts (e.g. tRPC).
 */
export const getSessionFromHeaders = async (requestHeaders: Headers) =>
  env.NEXT_PUBLIC_DISABLE_AUTH
    ? await getAuthDisabledSession()
    : await auth.api.getSession({ headers: requestHeaders });

export type Session = typeof auth.$Infer.Session;
export type AuthUserType = Session["user"];
