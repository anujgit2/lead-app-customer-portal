"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Applications", href: "/applications", icon: FileText },
  { label: "Profiles", href: "/profiles", icon: Users },
  { label: "Documents", href: "/documents", icon: Files },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    toast.success("Logged out successfully");
    router.push("/");
  };

  const initials = user ? getInitials(user.firstName, user.lastName) : "U";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-2 border-b border-border bg-card px-2 min-[901px]:gap-4 min-[901px]:px-4">
        <div className="flex min-w-0 items-center gap-2 min-[901px]:gap-4">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted min-[901px]:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

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
          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger shadow-[0_0_0_2px_hsl(var(--card))]" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </span>
              <span className="hidden min-[901px]:inline">{user?.firstName}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground min-[901px]:block" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-lg border border-border bg-popover p-1 text-sm shadow-md"
                >
                  <div className="px-2.5 py-2">
                    <p className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="-mx-1 my-1 h-px bg-border" />
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-muted"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-danger-strong hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
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
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
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
