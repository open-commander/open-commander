"use client";

import {
  CheckSquare,
  Keyboard,
  LayoutDashboard,
  Menu,
  Settings,
  Shield,
  Terminal,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { useShortcuts } from "@/components/shortcuts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navButtonBase =
  "flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-purple-500/15 hover:text-purple-300";

const iconProps = { className: "h-5 w-5", strokeWidth: 1.6 };
const iconPropsSmall = { className: "h-4 w-4", strokeWidth: 1.6 };

type AppSidebarContextValue = {
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const AppSidebarContext = createContext<AppSidebarContextValue | null>(null);

type AppSidebarProviderProps = {
  children: ReactNode;
};

export function AppSidebarProvider({ children }: AppSidebarProviderProps) {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const value = useMemo(
    () => ({ isMobileOpen, setMobileOpen }),
    [isMobileOpen],
  );
  return (
    <AppSidebarContext.Provider value={value}>
      {children}
    </AppSidebarContext.Provider>
  );
}

function useAppSidebarContext() {
  const context = useContext(AppSidebarContext);
  if (!context) {
    throw new Error(
      "AppSidebar components must be wrapped in AppSidebarProvider.",
    );
  }
  return context;
}

type AppSidebarToggleProps = {
  className?: string;
};

export function AppSidebarToggle({ className }: AppSidebarToggleProps) {
  const { setMobileOpen } = useAppSidebarContext();
  return (
    <button
      type="button"
      className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-purple-500/15 hover:text-purple-300 ${className ?? ""}`}
      aria-label="Open menu"
      title="Menu"
      onClick={() => setMobileOpen(true)}
    >
      <Menu aria-hidden="true" {...iconProps} />
    </button>
  );
}

export function AppSidebar() {
  const pathname = usePathname() ?? "/";
  const { isMobileOpen, setMobileOpen } = useAppSidebarContext();
  const { openShortcuts } = useShortcuts();
  const activePage =
    pathname === "/dashboard"
      ? "dashboard"
      : pathname.startsWith("/sessions")
        ? "sessions"
        : pathname.startsWith("/tasks")
          ? "tasks"
          : pathname.startsWith("/security")
            ? "security"
            : pathname.startsWith("/help")
              ? "help"
              : pathname.startsWith("/settings")
                ? "settings"
                : null;

  const linkClass = (isActive: boolean) =>
    `${navButtonBase} ${isActive ? "bg-purple-500/25 text-purple-200" : ""}`;
  const mobileLinkBase =
    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-purple-500/15 hover:text-purple-300";

  return (
    <>
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          isMobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            isMobileOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`relative z-10 flex h-full w-64 flex-col justify-between border-r border-purple-500/25 bg-(--oc-panel) px-4 py-6 backdrop-blur transition-transform duration-200 ease-out ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Navigation
            </span>
            <button
              type="button"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-purple-500/15 hover:text-purple-300"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X aria-hidden="true" {...iconPropsSmall} />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <Link
              href="/dashboard"
              className={`${mobileLinkBase} ${activePage === "dashboard" ? "bg-purple-500/25 text-purple-200" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <LayoutDashboard aria-hidden="true" {...iconProps} />
              Command Center
            </Link>
            <Link
              href="/sessions"
              className={`${mobileLinkBase} ${activePage === "sessions" ? "bg-purple-500/25 text-purple-200" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Terminal aria-hidden="true" {...iconProps} />
              TUI Sessions
            </Link>
            <Link
              href="/tasks"
              className={`${mobileLinkBase} ${activePage === "tasks" ? "bg-purple-500/25 text-purple-200" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <CheckSquare aria-hidden="true" {...iconProps} />
              Tasks
            </Link>
            <Link
              href="/security"
              className={`${mobileLinkBase} ${activePage === "security" ? "bg-purple-500/25 text-purple-200" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Shield aria-hidden="true" {...iconProps} />
              Security
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              className={`${mobileLinkBase} w-full text-left`}
              onClick={() => {
                openShortcuts(true);
                setMobileOpen(false);
              }}
            >
              <Keyboard aria-hidden="true" {...iconProps} />
              Shortcuts
            </button>
            <Link
              href="/settings"
              className={`${mobileLinkBase} ${activePage === "settings" ? "bg-purple-500/25 text-purple-200" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Settings aria-hidden="true" {...iconProps} />
              Settings
            </Link>
          </div>
        </aside>
      </div>

      <aside className="hidden w-16 flex-col items-center justify-between border-r border-purple-500/25 bg-(--oc-panel) px-1.5 py-6 md:flex">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard"
                  className={linkClass(activePage === "dashboard")}
                  aria-label="Command Center"
                  aria-current={activePage === "dashboard" ? "page" : undefined}
                >
                  <LayoutDashboard aria-hidden="true" {...iconProps} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Dashboard</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/sessions"
                  className={linkClass(activePage === "sessions")}
                  aria-label="TUI Sessions"
                  aria-current={activePage === "sessions" ? "page" : undefined}
                >
                  <Terminal aria-hidden="true" {...iconProps} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Sessions</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/tasks"
                  className={linkClass(activePage === "tasks")}
                  aria-label="Tasks"
                  aria-current={activePage === "tasks" ? "page" : undefined}
                >
                  <CheckSquare aria-hidden="true" {...iconProps} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Tasks</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/security"
                  className={linkClass(activePage === "security")}
                  aria-label="Security"
                  aria-current={activePage === "security" ? "page" : undefined}
                >
                  <Shield aria-hidden="true" {...iconProps} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Security</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={navButtonBase}
                  aria-label="Shortcuts"
                  onClick={() => openShortcuts(true)}
                >
                  <Keyboard aria-hidden="true" {...iconProps} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Shortcuts</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={linkClass(activePage === "settings")}
                  aria-label="Settings"
                  aria-current={activePage === "settings" ? "page" : undefined}
                >
                  <Settings aria-hidden="true" {...iconProps} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </aside>
    </>
  );
}
