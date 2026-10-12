"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Files,
  User,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Building2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { getInitials } from "@/lib/utils";
import { clearFullSession, hasAccessToken } from "@/lib/session";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Applications", href: "/applications", icon: FileText },
  { label: "Profiles", href: "/profiles", icon: Users },
  { label: "Documents", href: "/documents", icon: Files },
];

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const authorized = useSyncExternalStore(subscribeToStorage, hasAccessToken, () => false);

  useEffect(() => {
    // Read storage directly: the hydration snapshot is always `false`.
    if (hasAccessToken()) return;
    clearFullSession();
    router.replace("/auth/login");
  }, [router, authorized]);

  const handleLogout = async () => {
    await authService.logout();
    toast.success("Logged out successfully");
    router.push("/");
  };

  const initials = user ? getInitials(user.firstName, user.lastName) : "U";

  if (!authorized) {
    return (
      <div className="grid min-h-screen place-items-center bg-background" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-2 border-b border-border bg-card px-2 min-[901px]:gap-4 min-[901px]:px-4">
        <div className="flex min-w-0 items-center gap-2 min-[901px]:gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-[901px]:hidden [&_svg]:size-5"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>

          <Link href="/dashboard" className="flex items-center gap-2.5 text-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="hidden text-sm font-semibold tracking-[-0.01em] min-[901px]:block">
              LoanPortal
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 min-[901px]:flex" aria-label="Main">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-primary-soft text-primary-soft-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative [&_svg]:size-5"
            aria-label="Notifications"
          >
            <Bell />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger shadow-[0_0_0_2px_hsl(var(--card))]" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className="gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden min-[901px]:inline">{user?.firstName}</span>
                <ChevronDown className="hidden text-muted-foreground min-[901px]:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-danger-strong" onSelect={() => void handleLogout()}>
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] min-[901px]:hidden">
          <div
            className="absolute inset-0 bg-[hsl(200_40%_6%/0.5)]"
            onClick={() => setMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 flex-col gap-5 overflow-y-auto bg-card p-5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-[18px]">LoanPortal</span>
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="[&_svg]:size-5"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X />
              </Button>
            </div>
            <nav className="flex flex-col gap-0.5">
              {NAV_ITEMS.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium",
                      active
                        ? "bg-primary-soft text-primary-soft-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <main>
        <div className="mx-auto max-w-screen-2xl">{children}</div>
      </main>
    </div>
  );
}
