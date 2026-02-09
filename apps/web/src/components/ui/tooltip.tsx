"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 10, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-visible rounded-md border border-white/10 bg-(--oc-panel-strong) px-3 py-1.5 text-xs text-slate-200 shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "before:absolute before:size-0 before:border-[6px] before:border-transparent before:content-['']",
        "data-[side=top]:before:bottom-0 data-[side=top]:before:left-1/2 data-[side=top]:before:-translate-x-1/2 data-[side=top]:before:translate-y-full data-[side=top]:before:border-t-(--oc-panel-strong) data-[side=top]:before:border-x-transparent data-[side=top]:before:border-b-transparent",
        "data-[side=right]:before:left-0 data-[side=right]:before:top-1/2 data-[side=right]:before:-translate-x-full data-[side=right]:before:-translate-y-1/2 data-[side=right]:before:border-r-(--oc-panel-strong) data-[side=right]:before:border-y-transparent data-[side=right]:before:border-l-transparent",
        "data-[side=bottom]:before:top-0 data-[side=bottom]:before:left-1/2 data-[side=bottom]:before:-translate-x-1/2 data-[side=bottom]:before:-translate-y-full data-[side=bottom]:before:border-b-(--oc-panel-strong) data-[side=bottom]:before:border-x-transparent data-[side=bottom]:before:border-t-transparent",
        "data-[side=left]:before:right-0 data-[side=left]:before:top-1/2 data-[side=left]:before:translate-x-full data-[side=left]:before:-translate-y-1/2 data-[side=left]:before:border-l-(--oc-panel-strong) data-[side=left]:before:border-y-transparent data-[side=left]:before:border-r-transparent",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
