import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";
import "xterm/css/xterm.css";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { RootErrorFallback } from "@/components/root-error-page-fallback";
import { ShortcutsProvider } from "@/components/shortcuts";
import { TRPCReactProvider } from "@/trpc/react";

const firaSans = Fira_Sans({
  variable: "--font-oc-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-oc-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Open Commander",
  description:
    "Coordinate AI agents, automations and TUI sessions in one command.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${firaSans.variable} ${firaCode.variable} antialiased`}>
        <TRPCReactProvider>
          <ShortcutsProvider>
            <ErrorBoundary FallbackComponent={RootErrorFallback}>
              <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
            </ErrorBoundary>
          </ShortcutsProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
