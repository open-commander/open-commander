"use client";

import type * as React from "react";
import { Spinner, type SpinnerProps } from "@/components/spinner";

export interface FullPageSpinnerProps extends SpinnerProps {}

export const FullPageSpinner: React.FC<FullPageSpinnerProps> = ({
  size = "xl",
  ...props
}) => {
  return (
    <div className="flex min-h-screen min-w-screen items-center justify-center">
      <Spinner size={size} {...props} />
    </div>
  );
};
