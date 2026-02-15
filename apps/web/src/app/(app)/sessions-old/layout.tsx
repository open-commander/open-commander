import { api, HydrateClient } from "@/trpc/server";

export default async function SessionsPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await api.terminal.listSessions.prefetch();

  return <HydrateClient>{children}</HydrateClient>;
}
