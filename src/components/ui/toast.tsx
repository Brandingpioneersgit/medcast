"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

export { toast };

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-[var(--radius-lg)] !border !border-border !bg-surface !text-ink !shadow-lg",
          title: "!font-medium",
          description: "!text-ink-muted",
          actionButton: "!bg-ink !text-bg",
          cancelButton: "!bg-subtle !text-ink",
        },
      }}
    />
  );
}
