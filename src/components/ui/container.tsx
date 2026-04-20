import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ContainerWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

const widthMap: Record<ContainerWidth, string> = {
  sm: "max-w-[40rem]",
  md: "max-w-[48rem]",
  lg: "max-w-[64rem]",
  xl: "max-w-[80rem]",
  "2xl": "max-w-[90rem]",
  full: "max-w-none",
};

export function Container({
  width = "xl",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: ContainerWidth }) {
  return (
    <div className={cn("mx-auto w-full px-5 md:px-8", widthMap[width], className)} {...props}>
      {children}
    </div>
  );
}

type SectionTone = "default" | "subtle" | "inverted" | "accent";

const sectionToneMap: Record<SectionTone, string> = {
  default: "bg-bg text-ink",
  subtle: "bg-subtle text-ink",
  inverted: "bg-ink text-bg",
  accent: "bg-accent text-accent-contrast",
};

type SectionSize = "sm" | "md" | "lg";

const sectionSizeMap: Record<SectionSize, string> = {
  sm: "py-12 md:py-16",
  md: "py-16 md:py-24",
  lg: "py-24 md:py-32",
};

export function Section({
  tone = "default",
  size = "md",
  className,
  children,
  as: Comp = "section",
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  tone?: SectionTone;
  size?: SectionSize;
  as?: React.ElementType;
}) {
  return (
    <Comp className={cn(sectionToneMap[tone], sectionSizeMap[size], className)} {...props}>
      {children}
    </Comp>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  action,
  align = "start",
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  action?: React.ReactNode;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 md:mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "md:flex-col md:items-center md:text-center",
        className
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-3xl leading-[1.1] md:text-[2.5rem] lg:text-5xl">{title}</h2>
        {lead && <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-ink-muted md:text-lg">{lead}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
