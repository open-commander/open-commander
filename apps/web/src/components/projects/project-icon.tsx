"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProjectIconProps = {
  name: string;
  isActive: boolean;
  onClick: () => void;
};

/**
 * Extracts up to 2 initials from a project name.
 * "My App" → "MA", "backend" → "BA"
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Sidebar icon for a project. Shows 2-letter initials with active highlight.
 */
export function ProjectIcon({ name, isActive, onClick }: ProjectIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-xs font-bold tracking-wide transition-colors ${
            isActive
              ? "bg-emerald-400/20 text-emerald-300 ring-2 ring-emerald-400/40"
              : "bg-white/10 text-slate-300 hover:bg-purple-500/15 hover:text-purple-300"
          }`}
          onClick={onClick}
          aria-label={name}
        >
          {getInitials(name)}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{name}</TooltipContent>
    </Tooltip>
  );
}
