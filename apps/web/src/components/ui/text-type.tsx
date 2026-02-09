"use client";

import type { ElementType } from "react";
import { createElement, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Text typewriter animation (React Bits–style).
 * Types out text character by character with optional cursor and loop.
 * @see https://reactbits.dev/text-animations/text-type
 */
type TextTypeProps = {
  /** Text or array of texts to type out */
  text: string | string[];
  /** HTML tag or component to render as */
  as?: ElementType;
  /** Typing speed in ms (default 50) */
  typingSpeed?: number;
  /** Initial delay before typing starts (default 0) */
  initialDelay?: number;
  /** Pause between typing and deleting in ms (default 2000) */
  pauseDuration?: number;
  /** Deleting speed in ms (default 30) */
  deletingSpeed?: number;
  /** Whether to loop (default true) */
  loop?: boolean;
  /** Show blinking cursor (default true) */
  showCursor?: boolean;
  /** Cursor character (default "|") */
  cursorCharacter?: string;
  /** Cursor blink duration in s (default 0.5) */
  cursorBlinkDuration?: number;
  className?: string;
  cursorClassName?: string;
  /** Optional: style a range of the typed text (e.g. second word in another color) */
  styledRange?: { start: number; className: string };
};

export function TextType({
  text,
  as: Component = "span",
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  showCursor = true,
  cursorCharacter = "|",
  cursorBlinkDuration = 0.5,
  className,
  cursorClassName,
  styledRange,
}: TextTypeProps) {
  const fullTexts = Array.isArray(text) ? text : [text];
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [phase, setPhase] = useState<"idle" | "typing" | "pause" | "deleting">(
    "idle",
  );
  const [cursorVisible, setCursorVisible] = useState(true);

  const currentText = fullTexts[index] ?? "";
  const isFinished = !loop && display === currentText && currentText.length > 0;
  const showCursorBlink = phase !== "idle" || isFinished;

  // Cursor blink (keeps blinking when finished if loop is false)
  useEffect(() => {
    if (!showCursor || !showCursorBlink) return;
    const t = setInterval(() => {
      setCursorVisible((v) => !v);
    }, cursorBlinkDuration * 1000);
    return () => clearInterval(t);
  }, [showCursor, cursorBlinkDuration, showCursorBlink]);

  // Typing / deleting
  useEffect(() => {
    let initialTimer: ReturnType<typeof setTimeout>;
    let typingTimer: ReturnType<typeof setInterval>;
    let pauseTimer: ReturnType<typeof setTimeout>;
    let deletingTimer: ReturnType<typeof setInterval>;

    const startTyping = () => {
      setPhase("typing");
      setDisplay("");
      let i = 0;
      typingTimer = setInterval(() => {
        if (i <= currentText.length) {
          setDisplay(currentText.slice(0, i));
          i++;
        } else {
          clearInterval(typingTimer);
          setPhase("pause");
          pauseTimer = setTimeout(() => {
            if (!loop) {
              setPhase("idle");
              return;
            }
            setPhase("deleting");
            let j = currentText.length;
            deletingTimer = setInterval(() => {
              if (j >= 0) {
                setDisplay(currentText.slice(0, j));
                j--;
              } else {
                clearInterval(deletingTimer);
                setIndex((prev) => (prev + 1) % fullTexts.length);
                setPhase("idle");
              }
            }, deletingSpeed);
          }, pauseDuration);
        }
      }, typingSpeed);
    };

    initialTimer = setTimeout(startTyping, initialDelay);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(typingTimer);
      clearTimeout(pauseTimer);
      clearInterval(deletingTimer);
    };
  }, [
    currentText,
    fullTexts.length,
    typingSpeed,
    initialDelay,
    pauseDuration,
    deletingSpeed,
    loop,
  ]);

  const cursorEl =
    showCursor && showCursorBlink ? (
      <span
        className={cn(
          "inline-block transition-opacity",
          cursorVisible ? "opacity-100" : "opacity-0",
          cursorClassName,
        )}
        style={{ transitionDuration: `${cursorBlinkDuration * 500}ms` }}
        aria-hidden
      >
        {cursorCharacter}
      </span>
    ) : null;

  const start = styledRange?.start ?? 0;
  const part1 =
    start > 0 && display.length > start ? display.slice(0, start) : display;
  const part2 =
    styledRange && display.length > start ? display.slice(start) : null;

  const content =
    part2 && styledRange
      ? [
          part1,
          createElement(
            "span",
            { key: "styled", className: styledRange.className },
            part2,
          ),
          cursorEl,
        ]
      : [display, cursorEl];

  return createElement(
    Component,
    { className: cn("inline", className) },
    ...content,
  );
}
