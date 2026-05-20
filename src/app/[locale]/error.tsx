"use client";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleErrorBoundary({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: "calc(100vh - 200px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "4rem 2rem",
      textAlign: "center",
      background: "var(--color-paper, #f9f7f4)",
      color: "var(--color-ink, #1a1a1a)",
    }}>
      <div style={{ maxWidth: "520px" }}>
        <h1 style={{
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          fontWeight: 700,
          marginBottom: "1rem",
          fontFamily: "var(--font-display, serif)",
          color: "var(--color-teal, #0d9488)",
        }}>
          Something went wrong
        </h1>
        <p style={{
          color: "var(--color-ink-subtle, #666)",
          marginBottom: "2rem",
          lineHeight: 1.7,
        }}>
          We encountered an unexpected error loading this page. Your progress has been preserved.
          Please try again or contact our care team if the problem persists.
        </p>
        {error?.digest && (
          <p style={{
            fontSize: "0.7rem",
            color: "var(--color-border-strong, #999)",
            fontFamily: "monospace",
            marginBottom: "1rem",
          }}>
            ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 2rem",
            background: "var(--color-teal, #0d9488)",
            color: "white",
            border: "none",
            borderRadius: "999px",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "filter 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "")}
        >
          Try again
        </button>
      </div>
    </div>
  );
}