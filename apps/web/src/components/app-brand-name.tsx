import { cn } from "@/lib/utils";

type AppBrandNameProps = {
  className?: string;
};

/**
 * Renders the app brand text "OPEN COMMANDER" with styled emphasis.
 */
export function AppBrandName({ className }: AppBrandNameProps) {
  return (
    <span className={cn("text-xl font-semibold text-white", className)}>
      OPEN <span className="font-bold text-purple-400">COMMANDER</span>
    </span>
  );
}
