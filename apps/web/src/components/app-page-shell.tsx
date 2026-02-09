import { Settings, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedPageTitle } from "@/components/ui/animated-page-title";

type AppPageShellProps = {
  title: string;
  /** Optional: style a range of the title (e.g. second word in purple) */
  titleStyledRange?: { start: number; className: string };
  description?: string;
  children?: ReactNode;
};

export function AppPageShell({
  title,
  titleStyledRange,
  description,
  children,
}: AppPageShellProps) {
  const isCommandCenter = title === "Command Center";
  const isSettings = title === "Settings";
  const titleEl =
    titleStyledRange && title.length > titleStyledRange.start ? (
      <>
        {title.slice(0, titleStyledRange.start)}
        <span className={titleStyledRange.className}>
          {title.slice(titleStyledRange.start)}
        </span>
      </>
    ) : (
      title
    );

  const headerTitle = isCommandCenter ? (
    <AnimatedPageTitle
      icon={Terminal}
      text="Command Center"
      iconClassName="text-purple-400"
      styledRange={{ start: 8, className: "text-purple-400" }}
      cursor={{ character: "|" }}
    />
  ) : isSettings ? (
    <AnimatedPageTitle
      icon={Settings}
      text="Settings"
      iconClassName="text-slate-400"
      cursor={{ character: "|" }}
    />
  ) : (
    <div className="flex items-center gap-3">
      <h1 className="text-3xl font-semibold text-white">{titleEl}</h1>
    </div>
  );

  return (
    <>
      <header className="relative z-10 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {headerTitle}
          {!!description && (
            <p className="max-w-2xl text-sm text-slate-300">{description}</p>
          )}
        </div>
      </header>
      <div className="relative z-10 flex flex-1 flex-col gap-6">{children}</div>
    </>
  );
}
