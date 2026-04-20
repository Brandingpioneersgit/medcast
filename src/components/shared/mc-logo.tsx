import { cn } from "@/lib/utils/cn";

type Props = {
  size?: number;
  color?: string;
  mark?: boolean;
  wordmark?: boolean;
  inkAccent?: string;
  className?: string;
};

export function McLogo({
  size = 32,
  color = "currentColor",
  mark = true,
  wordmark = true,
  inkAccent = "var(--color-bg)",
  className,
}: Props) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      style={{ color }}
      aria-label="Medcasts"
    >
      {mark && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="1.25" fill="none" opacity="0.35" />
          <g stroke={color} strokeWidth="1.25" opacity="0.5">
            <line x1="24" y1="3" x2="24" y2="7" />
            <line x1="24" y1="41" x2="24" y2="45" />
            <line x1="3" y1="24" x2="7" y2="24" />
            <line x1="41" y1="24" x2="45" y2="24" />
          </g>
          <g>
            <path
              d="M24 10 L24 38 M10 24 L38 24"
              stroke={color}
              strokeWidth="4.25"
              strokeLinecap="round"
            />
            <circle cx="24" cy="24" r="3.25" fill={inkAccent} />
            <circle cx="24" cy="24" r="1.5" fill={color} />
          </g>
        </svg>
      )}
      {wordmark && (
        <span
          className="display display-tight"
          style={{
            fontWeight: 600,
            fontSize: size * 0.62,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          medcasts<span style={{ color: "var(--color-coral)" }}>.</span>
        </span>
      )}
    </span>
  );
}
