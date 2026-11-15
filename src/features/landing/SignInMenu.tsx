"use client";

import { ChevronDown, Briefcase, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";

/** Sign-in destinations come from the tenant UI config (`signInUrls`). The menu is hidden when none are set. */
export function SignInMenu({
  className,
  variant = "ghost",
  size = "default",
}: {
  className?: string;
  variant?: "ghost" | "outline";
  size?: "default" | "lg";
}) {
  const { config } = useTenantUi();
  const urls = config.signInUrls;
  const ITEMS = [
    urls?.customer && {
      label: "Customer sign in",
      description: "Your profile and applications",
      href: urls.customer,
      icon: User,
    },
    urls?.partner && {
      label: "Partner sign in",
      description: "Manage client applications",
      href: urls.partner,
      icon: Briefcase,
    },
  ].filter((item): item is { label: string; description: string; href: string; icon: typeof User } => Boolean(item));

  if (ITEMS.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className} aria-label="Sign in menu">
          Sign in
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {ITEMS.map((item) => (
          <DropdownMenuItem key={item.label} asChild className="cursor-pointer py-2.5">
            <a href={item.href}>
              <item.icon className="h-4 w-4 text-primary" aria-hidden />
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </span>
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
