"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/features/auth/AuthScreen";
import {
  IDLE_LOCK_MS,
  beginIdleLock,
  endIdleLock,
  getIdleLockState,
  getServerIdleLockState,
  isIdleLocked,
  isIdleLockPath,
  subscribeIdleLock,
} from "@/lib/idle-lock";
import { queryClient } from "@/lib/query-client";
import { emitAuthStorageChange, hasAccessToken, subscribeAuthStorage } from "@/lib/session";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import type { User } from "@/types";

const passwordSchema = z.object({
  password: z.string().min(1, "Enter your password."),
});

type PasswordForm = z.infer<typeof passwordSchema>;

let engaging = false;

function readSignedInUser(): User | null {
  const fromStore = useAuthStore.getState().user;
  if (fromStore) return fromStore;
  try {
    return authService.getCurrentUser();
  } catch {
    return null;
  }
}

function engageIdleLock() {
  if (engaging || isIdleLocked() || !hasAccessToken()) return;
  const user = readSignedInUser();
  const identifier = (user?.email || user?.phone || "").trim();
  if (!user || !identifier) return;

  engaging = true;
  const rememberMe = !!localStorage.getItem("accessToken");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  beginIdleLock({ identifier, displayName, rememberMe });
  void queryClient.cancelQueries();

  void authService.suspendSession().finally(() => {
    engaging = false;
  });
}

function loginErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message).trim();
    if (message) return message;
  }
  return "That password is incorrect. Try again.";
}

function IdleLockDialog({
  identifier,
  displayName,
  rememberMe,
}: {
  identifier: string;
  displayName: string;
  rememberMe: boolean;
}) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });
  const { ref: passwordRef, ...passwordField } = register("password");

  useEffect(() => {
    const overlay = overlayRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let portal: HTMLElement | null = overlay;
    while (portal?.parentElement && portal.parentElement !== document.body) {
      portal = portal.parentElement;
    }

    const touched: { element: HTMLElement; filter: string; inert: boolean }[] = [];
    for (const child of document.body.children) {
      if (!(child instanceof HTMLElement) || child === portal) continue;
      touched.push({
        element: child,
        filter: child.style.filter,
        inert: child.hasAttribute("inert"),
      });
      child.setAttribute("inert", "");
      child.style.filter = "blur(16px)";
    }

    const frame = window.requestAnimationFrame(() => setFocus("password"));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== "Tab" || !overlay) return;
      const items = [...overlay.querySelectorAll<HTMLElement>("button, input, a")].filter(
        (element) => !element.hasAttribute("disabled")
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      for (const item of touched) {
        item.element.style.filter = item.filter;
        if (item.inert) item.element.setAttribute("inert", "");
        else item.element.removeAttribute("inert");
      }
    };
  }, [setFocus]);

  const onSubmit = async (data: PasswordForm) => {
    setFormError(null);
    try {
      const response = await authService.login({
        email: identifier,
        password: data.password,
        rememberMe,
      });
      useAuthStore.getState().setUser(response.user);
      // Publish the new token before unlocking so this page is never treated as signed out.
      emitAuthStorageChange();
      endIdleLock();
    } catch (error: unknown) {
      setFormError(loginErrorMessage(error));
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await authService.logout();
      toast.success("Logged out successfully");
    } finally {
      endIdleLock();
      router.replace("/auth/login");
    }
  };

  const busy = isSubmitting || signingOut;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[hsl(200_40%_6%/0.45)]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="idle-lock-title"
        aria-describedby="idle-lock-description"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        <div className="flex flex-col items-start gap-6">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
            <Lock className="h-5 w-5" />
          </span>

          <div className="flex flex-col gap-1">
            <h2
              id="idle-lock-title"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              Session locked
            </h2>
            <p id="idle-lock-description" className="text-sm font-normal text-muted-foreground">
              You were idle for 5 minutes, so this session was signed out. Enter your password to
              continue on this page.
            </p>
          </div>

          <div className="w-full rounded-lg border border-border bg-muted/60 px-4 py-3">
            {displayName ? (
              <p className="text-sm font-semibold tracking-tight text-foreground">{displayName}</p>
            ) : null}
            <p className="truncate text-sm font-normal text-muted-foreground">{identifier}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-6" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idle-lock-password">Password</Label>
              <Input
                id="idle-lock-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                placeholder="Enter your password"
                error={!!errors.password || !!formError}
                aria-describedby={
                  errors.password || formError ? "idle-lock-password-err" : undefined
                }
                className="h-11 bg-background focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                startAdornment={<Lock className="h-4 w-4" />}
                {...passwordField}
                ref={passwordRef}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((open) => !open)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-all duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-[0.98]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <FieldError id="idle-lock-password-err">
                {errors.password?.message ?? formError ?? undefined}
              </FieldError>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                size="lg"
                loading={isSubmitting}
                disabled={busy}
                className="h-11 w-full font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {isSubmitting ? "Signing in…" : "Continue"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void onSignOut()}
                className="h-11 w-full text-muted-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-foreground active:scale-[0.98]"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function IdleLock() {
  const pathname = usePathname();
  const authed = useSyncExternalStore(subscribeAuthStorage, hasAccessToken, () => false);
  const lock = useSyncExternalStore(subscribeIdleLock, getIdleLockState, getServerIdleLockState);

  useEffect(() => {
    if (lock.locked || !authed || !isIdleLockPath(pathname)) return;

    let lastActivity = Date.now();
    let lastMark = 0;
    let timer = 0;

    const arm = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        engageIdleLock();
      }, delay);
    };

    const markActive = () => {
      const now = Date.now();
      if (now - lastMark < 1000) return;
      lastMark = now;
      lastActivity = now;
      arm(IDLE_LOCK_MS);
    };

    const onWake = () => {
      const idleFor = Date.now() - lastActivity;
      if (idleFor >= IDLE_LOCK_MS) {
        engageIdleLock();
        return;
      }
      arm(IDLE_LOCK_MS - idleFor);
    };

    const events = ["pointerdown", "keydown", "scroll", "touchstart", "wheel", "mousemove"] as const;
    arm(IDLE_LOCK_MS);
    for (const eventName of events) {
      window.addEventListener(eventName, markActive, { capture: true, passive: true });
    }
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      window.clearTimeout(timer);
      for (const eventName of events) {
        window.removeEventListener(eventName, markActive, { capture: true });
      }
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [authed, lock.locked, pathname]);

  if (!lock.locked || typeof document === "undefined") return null;

  return createPortal(
    <IdleLockDialog
      identifier={lock.identifier}
      displayName={lock.displayName}
      rememberMe={lock.rememberMe}
    />,
    document.body
  );
}
