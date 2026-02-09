import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card container component.
 */
const Card = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="card"
    className={cn(
      "rounded-2xl border border-white/10 bg-(--oc-panel) text-white",
      className,
    )}
    {...props}
  />
);

/**
 * Card header wrapper.
 */
const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="card-header"
    className={cn("flex flex-col gap-2 p-6", className)}
    {...props}
  />
);

/**
 * Card title element.
 */
const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    data-slot="card-title"
    className={cn("text-lg font-semibold text-white", className)}
    {...props}
  />
);

/**
 * Card description element.
 */
const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    data-slot="card-description"
    className={cn("text-sm text-slate-300", className)}
    {...props}
  />
);

/**
 * Card content wrapper.
 */
const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="card-content"
    className={cn("flex flex-col gap-4 px-6 pb-6", className)}
    {...props}
  />
);

/**
 * Card footer wrapper.
 */
const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="card-footer"
    className={cn("flex items-center gap-3 px-6 pb-6", className)}
    {...props}
  />
);

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
