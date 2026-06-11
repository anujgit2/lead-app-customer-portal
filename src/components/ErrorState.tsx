"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Home,
  LogOut,
  RefreshCw,
  LogIn,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import {
  clearAuthError,
  clearFullSession,
  hasAuthArtifacts,
  type AuthErrorCode,
} from "@/lib/session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  code?: AuthErrorCode;
  status?: number;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

function getDefaultTitle(code?: AuthErrorCode, status?: number): string {
  if (code === "SESSION_EXPIRED" || status === 401) return "Session expired";
  if (code === "FORBIDDEN" || status === 403) return "Access denied";
  if (code === "NOT_FOUND" || status === 404) return "Not found";
  if (code === "NETWORK") return "Connection problem";
  return "Something went wrong";
}

export function ErrorState({
  title,
  message,
  code,
  status,
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const showLogout = hasAuthArtifacts();
  const isSessionError =
    code === "SESSION_EXPIRED" || code === "UNAUTHORIZED" || status === 401;
  const isNetworkError = code === "NETWORK" || status === 0;
  const heading = title ?? getDefaultTitle(code, status);

  const iconClassName = cn(
    isSessionError ? "text-amber-600" : "text-destructive",
    compact ? "h-6 w-6" : "h-7 w-7"
  );

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
      toast.success("Signed out successfully");
      router.push("/auth/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSignIn = () => {
    clearFullSession();
    router.push("/auth/login");
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    clearAuthError();
    router.refresh();
  };

  const content = (
    <Card className={cn("border-0 shadow-xl shadow-gray-100/50", compact && "shadow-md")}>
      <CardContent className={cn("p-8 flex flex-col items-center gap-5 text-center", compact && "p-6")}>
        <div
          className={cn(
            "rounded-full flex items-center justify-center",
            isSessionError ? "bg-amber-100" : "bg-destructive/10",
            compact ? "w-12 h-12" : "w-14 h-14"
          )}
        >
          {isNetworkError ? (
            <WifiOff className={iconClassName} />
          ) : isSessionError ? (
            <ShieldAlert className={iconClassName} />
          ) : (
            <AlertCircle className={iconClassName} />
          )}
        </div>

        <div className="space-y-2">
          <h1 className={cn("font-semibold text-foreground", compact ? "text-lg" : "text-xl")}>
            {heading}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
          {user && (
            <p className="text-xs text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </span>
              {user.email ? ` (${user.email})` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 w-full">
          {onRetry && (
            <Button onClick={handleRetry} className="gap-2 w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}

          {isSessionError && (
            <Button onClick={handleSignIn} className="gap-2 w-full sm:w-auto">
              <LogIn className="h-4 w-4" />
              Sign in again
            </Button>
          )}

          {showLogout && (
            <Button
              variant="outline"
              onClick={handleLogout}
              loading={isLoggingOut}
              className="gap-2 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          )}

          {!isSessionError && !showLogout && (
            <Button asChild className="gap-2 w-full sm:w-auto">
              <Link href="/auth/login">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}

          {!isSessionError && showLogout && !onRetry && (
            <Button asChild variant="secondary" className="gap-2 w-full sm:w-auto">
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                Go to dashboard
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (compact) {
    return <div className={cn("w-full", className)}>{content}</div>;
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4",
        className
      )}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
        </div>
        {content}
      </div>
    </div>
  );
}
