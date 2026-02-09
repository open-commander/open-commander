import { redirect } from "next/navigation";
import { env } from "@/env";
import { getServerSession } from "@/server/auth";

export default async function HomePage() {
  if (env.NEXT_PUBLIC_DISABLE_AUTH) {
    redirect("/dashboard");
  }

  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  redirect("/who");
}
