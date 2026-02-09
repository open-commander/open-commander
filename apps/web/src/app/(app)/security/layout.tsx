import { api, HydrateClient } from "@/trpc/server";

export default async function SecurityPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await api.security.egressLogs.prefetch({
    page: 1,
    pageSize: 40,
    status: "all",
  });

  return <HydrateClient>{children}</HydrateClient>;
}
