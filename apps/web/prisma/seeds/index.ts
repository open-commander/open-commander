import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/server/auth";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });

export const DEFAULT_ADMIN_EMAIL = "admin@opencommander.com";

type SeedUser = {
  name: string;
  email: string;
  role: "admin" | "user";
  verified: boolean;
};

const users: SeedUser[] = [
  {
    name: "Administrator",
    email: DEFAULT_ADMIN_EMAIL,
    role: "admin",
    verified: true,
  },
];

/**
 * Ensures a seed user exists with the expected role and verification status.
 */
const ensureSeedUser = async (user: SeedUser) => {
  const email = user.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!existing) {
    const res = await auth.api.createUser({
      body: {
        name: user.name,
        email,
        role: user.role,
        data: {
          emailVerified: user.verified,
        },
      },
    });

    return res.user;
  }

  return await prisma.user.update({
    where: {
      id: existing.id,
    },
    data: {
      name: user.name,
      role: user.role,
      emailVerified: user.verified,
    },
  });
};

/**
 * Seed default users.
 */
(async function main() {
  await Promise.all(users.map(ensureSeedUser));
})();
