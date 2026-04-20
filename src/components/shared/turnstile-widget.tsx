"use client";

import { useEffect, useRef } from "react";

interface Props {
  onToken: (token: string) => void;
  onError?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileWidget({ onToken, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    const script = document.querySelector<HTMLScriptElement>('script[data-turnstile="1"]');
    if (!script) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      s.async = true; s.defer = true;
      s.dataset.turnstile = "1";
      document.head.appendChild(s);
      window.onTurnstileLoad = () => render();
    } else {
      render();
    }

    function render() {
      if (ref.current && window.turnstile) {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          callback: onToken,
          "error-callback": onError,
          theme: "light",
        });
      }
    }
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    };
  }, [onToken, onError]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="mt-2" />;
}
