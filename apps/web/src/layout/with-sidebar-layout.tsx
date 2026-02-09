import type { ReactNode } from "react";
import { AppNavbar } from "@/components/app-navbar";
import { AppSidebar, AppSidebarProvider } from "@/components/app-sidebar";
import Squares from "@/components/squares";
import type { AuthUserType } from "@/server/auth";

type WithSidebarLayoutProps = {
  showSquaresBackground?: boolean;
  children?: ReactNode;
  hideSidebar?: boolean;
  user?: AuthUserType;
};

export function WithSidebarLayout({
  showSquaresBackground = false,
  children,
  hideSidebar = false,
  user,
}: WithSidebarLayoutProps) {
  return (
    <AppSidebarProvider>
      <div className="min-h-screen bg-background text-white">
        <div className="flex min-h-screen flex-col">
          <AppNavbar user={user} />

          <div className="flex flex-1">
            {!hideSidebar && <AppSidebar />}
            <main className="relative flex flex-1 flex-col gap-8 p-8">
              {showSquaresBackground && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <div className="h-full w-full">
                    <Squares
                      direction="diagonal"
                      speed={0.5}
                      squareSize={40}
                      borderColor="#271E37"
                      hoverFillColor="#222222"
                    />
                  </div>
                </div>
              )}
              {children}
            </main>
          </div>
        </div>
      </div>
    </AppSidebarProvider>
  );
}
