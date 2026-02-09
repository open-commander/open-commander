import { redirect } from "next/navigation";
import { WithSidebarLayout } from "@/layout/with-sidebar-layout";
import { getServerSession } from "@/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <WithSidebarLayout user={session.user} showSquaresBackground>
      {children}
    </WithSidebarLayout>
  );
}
