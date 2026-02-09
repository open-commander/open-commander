"use client";

import type { LucideIcon } from "lucide-react";
import { TextType } from "@/components/ui/text-type";

export type AnimatedPageTitleStyledRange = {
  start: number;
  className: string;
};

export type AnimatedPageTitleCursor = {
  show?: boolean;
  character?: string;
  blinkDuration?: number;
};

type AnimatedPageTitleProps = {
  /** Lucide icon component (e.g. Terminal, Shield, Settings) */
  icon: LucideIcon;
  /** Title text to type out (trailing space recommended when using cursor) */
  text: string;
  /** Icon wrapper className (e.g. "text-purple-400", "text-red-400") */
  iconClassName: string;
  /** Optional: style a range of the text (e.g. second word in accent color) */
  styledRange?: AnimatedPageTitleStyledRange;
  /** Typing speed in ms (default 75) */
  typingSpeed?: number;
  /** Pause after typing in ms (default 1500) */
  pauseDuration?: number;
  /** Whether to loop (default false) */
  loop?: boolean;
  /** Cursor options (default: block cursor, 0.5s blink) */
  cursor?: AnimatedPageTitleCursor;
};

const defaultCursor: Required<AnimatedPageTitleCursor> = {
  show: true,
  character: "|",
  blinkDuration: 0.5,
};

/**
 * Page header with icon and typewriter title animation.
 * Use for Command Center, Security, Settings, etc. with icon + accent range + cursor.
 */
export function AnimatedPageTitle({
  icon: Icon,
  text,
  iconClassName,
  styledRange,
  typingSpeed = 75,
  pauseDuration = 1500,
  loop = false,
  cursor: cursorOpts,
}: AnimatedPageTitleProps) {
  const cursor = { ...defaultCursor, ...cursorOpts };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center ${iconClassName}`}
      >
        <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
      </div>
      <h1 className="text-3xl font-semibold text-white">
        <TextType
          text={text}
          as="span"
          typingSpeed={typingSpeed}
          pauseDuration={pauseDuration}
          loop={loop}
          showCursor={cursor.show}
          cursorCharacter={cursor.character}
          cursorBlinkDuration={cursor.blinkDuration}
          styledRange={styledRange}
        />
      </h1>
    </div>
  );
}
