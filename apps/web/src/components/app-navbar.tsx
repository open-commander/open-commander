"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef } from "react";
import { env } from "@/env";
import type { AuthUserType } from "@/server/auth";
import { authClient } from "@/server/auth/client";
import { AppBrandName } from "./app-brand-name";
import { AppSidebarToggle } from "./app-sidebar";
import { AppStatusButton, type AppStatusButtonRef } from "./app-status-button";
import type { AppUserButtonMenuItem } from "./app-user-button";
import { AppUserButton, type AppUserButtonRef } from "./app-user-button";

const USER_MENU: AppUserButtonMenuItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  {
    label: "Sign out",
    href: "#",
    icon: LogOut,
    onClick: async () => {
      await authClient.signOut();
      window.location.href = "/";
    },
  },
];

interface Props {
  user?: AuthUserType;
}

export function AppNavbar({ user }: Props) {
  const statusButtonRef = useRef<AppStatusButtonRef>(null);
  const userButtonRef = useRef<AppUserButtonRef>(null);
  const isAuthDisabled = env.NEXT_PUBLIC_DISABLE_AUTH;

  const onStatusOpen = useCallback(() => {
    userButtonRef.current?.close();
  }, []);

  const onUserMenuOpen = useCallback(() => {
    statusButtonRef.current?.close();
  }, []);

  let auth = (
    <Link
      type="button"
      className="flex items-center justify-center rounded-full outline-none ring-purple-400/50 transition focus-visible:ring-2"
      href="/login"
    >
      Login
    </Link>
  );

  if (user) {
    auth = (
      <div className="relative flex items-center gap-2">
        <AppStatusButton ref={statusButtonRef} onOpen={onStatusOpen} />
        {!isAuthDisabled && (
          <AppUserButton
            ref={userButtonRef}
            menuEntries={USER_MENU}
            avatarSrc={user.image ?? undefined}
            avatarAlt={user.name ?? "User avatar"}
            onOpen={onUserMenuOpen}
          />
        )}
      </div>
    );
  }

  return (
    <nav className="flex items-center justify-between border-b border-purple-500/25 bg-(--oc-panel) px-6 py-4">
      <div className="flex items-center gap-4">
        <AppSidebarToggle className="md:hidden" />
        <AppBrandName />
      </div>
      {auth}
    </nav>
  );
}
