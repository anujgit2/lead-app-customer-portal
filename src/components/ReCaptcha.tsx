"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Google's documented test key. It always issues a passing token so the signup
 * flow stays usable before real keys are provisioned. Set
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY for any deployed environment, and verify the
 * token server side — a client-only check stops nothing on its own.
 */
const RECAPTCHA_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || RECAPTCHA_TEST_SITE_KEY;

export const IS_RECAPTCHA_TEST_KEY =
  RECAPTCHA_SITE_KEY === RECAPTCHA_TEST_SITE_KEY;

interface ReCaptchaRenderParams {
  sitekey: string;
  theme?: "light" | "dark";
  size?: "normal" | "compact";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}

interface ReCaptchaApi {
  render: (container: HTMLElement, params: ReCaptchaRenderParams) => number;
  reset: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: ReCaptchaApi;
    onReCaptchaApiLoad?: () => void;
  }
}

let apiLoader: Promise<void> | null = null;

function loadReCaptchaApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha?.render) return Promise.resolve();
  if (apiLoader) return apiLoader;

  apiLoader = new Promise<void>((resolve, reject) => {
    window.onReCaptchaApiLoad = () => resolve();

    const script = document.createElement("script");
    script.src =
      "https://www.google.com/recaptcha/api.js?onload=onReCaptchaApiLoad&render=explicit";
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      // Allow a later retry to re-add the script tag.
      apiLoader = null;
      reject(new Error("Unable to load reCAPTCHA"));
    };

    document.head.appendChild(script);
  });

  return apiLoader;
}

export interface ReCaptchaHandle {
  reset: () => void;
}

interface ReCaptchaProps {
  onChange: (token: string | null) => void;
  className?: string;
}

type WidgetStatus = "loading" | "ready" | "unavailable";

export const ReCaptcha = forwardRef<ReCaptchaHandle, ReCaptchaProps>(
  function ReCaptcha({ onChange, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const onChangeRef = useRef(onChange);
    const [status, setStatus] = useState<WidgetStatus>("loading");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current === null) return;
        window.grecaptcha?.reset(widgetIdRef.current);
        onChangeRef.current(null);
      },
    }));

    useEffect(() => {
      let cancelled = false;
      setStatus("loading");

      loadReCaptchaApi()
        .then(() => {
          if (cancelled || !containerRef.current) return;
          if (widgetIdRef.current === null) {
            widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
              sitekey: RECAPTCHA_SITE_KEY,
              callback: (token) => onChangeRef.current(token),
              "expired-callback": () => onChangeRef.current(null),
              "error-callback": () => onChangeRef.current(null),
            });
          }
          setStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setStatus("unavailable");
        });

      return () => {
        cancelled = true;
      };
    }, [attempt]);

    if (status === "unavailable") {
      return (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4",
            className
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <div className="space-y-2">
            <p className="text-xs text-destructive">
              The human verification challenge could not load. Check your network
              connection or any ad blockers, then try again.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive transition-all duration-200 ease-out hover:underline active:scale-[0.98]"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", className)}>
        {status === "loading" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading human verification…
          </div>
        )}
        <div ref={containerRef} />
      </div>
    );
  }
);
