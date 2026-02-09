"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-triggered entrance animation (React Bits–style).
 * Animates content when it enters the viewport: move + fade in.
 * @see https://reactbits.dev/animations/animated-content
 */
type AnimatedContentProps = {
  children: ReactNode;
  /** Distance in px to move during animation (default 100) */
  distance?: number;
  /** "vertical" | "horizontal" (default "vertical") */
  direction?: "vertical" | "horizontal";
  /** Reverse movement direction (default false) */
  reverse?: boolean;
  /** Duration in seconds (default 0.8) */
  duration?: number;
  /** GSAP ease (default "power3.out") */
  ease?: string;
  /** Initial opacity (default 0) */
  initialOpacity?: number;
  /** Animate opacity (default true) */
  animateOpacity?: boolean;
  /** Delay in seconds (default 0) */
  delay?: number;
  className?: string;
};

export function AnimatedContent({
  children,
  distance = 100,
  direction = "vertical",
  reverse = false,
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  animateOpacity = true,
  delay = 0,
  className,
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sign = reverse ? 1 : -1;
    const y = direction === "vertical" ? sign * distance : 0;
    const x = direction === "horizontal" ? sign * distance : 0;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          opacity: initialOpacity,
          y,
          x,
        },
        {
          opacity: animateOpacity ? 1 : initialOpacity,
          y: 0,
          x: 0,
          duration,
          delay,
          ease,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "bottom 15%",
            toggleActions: "play none none none",
          },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    delay,
  ]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
