"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { clearFullSession } from "@/lib/session";
import { toast } from "sonner";
import { FieldError } from "@/features/auth/AuthScreen";
import { FieldStack, inputFields } from "@/features/tenant-ui/FieldStack";
import { AUTH_FORM_ROUTES } from "@/features/tenant-ui/form-routes";
import { lendingSiteHome } from "@/lib/portal-urls";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";
import type { UiFormField } from "@/features/tenant-ui/types";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email or mobile number.")
    .refine((value) => {
      const compact = value.replace(/[\s-]/g, "");
      const isEmail = z.string().email().safeParse(value).success;
      const isMobile = /^[6-9]\d{9}$/.test(compact);
      return isEmail || isMobile;
    }, "Enter a valid email or 10-digit mobile number."),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { config } = useTenantUi();
  const formCopy = config.forms.signin;
  const [showPassword, setShowPassword] = useState(false);

  // Clear all tokens and cookies when landing on login page
  useEffect(() => {
    clearFullSession();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const inputs = inputFields(formCopy.fields);
  const forgot = formCopy.links.find((link) => link.key === "forgotPassword");
  const otherLinks = formCopy.links.filter((link) => link.key !== "forgotPassword");

  const renderInput = (field: UiFormField) => {
    if (field.key === "identifier") {
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identifier">{field.label}</Label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder={field.placeholder}
            error={!!errors.email}
            aria-describedby={errors.email ? "identifier-err" : undefined}
            className="h-11 bg-background"
            startAdornment={<Mail className="h-4 w-4" />}
            {...register("email")}
          />
          <FieldError id="identifier-err">{errors.email?.message}</FieldError>
        </div>
      );
    }

    if (field.key !== "password") return null;

  return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{field.label}</Label>
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder={field.placeholder}
          error={!!errors.password}
          aria-describedby={errors.password ? "password-err" : undefined}
          className="h-11 bg-background"
          startAdornment={<Lock className="h-4 w-4" />}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((open) => !open)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register("password")}
        />
        <FieldError id="password-err">{errors.password?.message}</FieldError>
      </div>
    );
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      // The "Keep me signed in" option is gone, so sessions keep the old default: remembered.
      const res = await authService.login({ ...data, rememberMe: true });
      setUser(res.user);
      toast.success(`Welcome back, ${res.user.firstName}!`);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Login failed. Please try again.";
      toast.error(message);
    }
  };

  const landingHref = lendingSiteHome();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-[18px] py-10 text-foreground">
      <main className="auth-card w-full max-w-[420px] rounded-[10px] border border-border bg-card p-6 shadow-2 sm:p-8">
        <a href={landingHref} aria-label="Loantris home" className="inline-block">
          {/* Brand logo image in place of the text wordmark, for now the sign-in page only. */}
          <Image src="/brand/loantris-primary.svg" alt="Loantris" width={141} height={32} className="h-8 w-auto" />
        </a>

        <div className="mt-8 flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-semibold leading-7 tracking-[-0.015em] text-foreground">{formCopy.title}</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{formCopy.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FieldStack fields={inputs} render={renderInput} />

            {forgot && (
              <div className="-mt-1 flex flex-wrap items-center justify-end gap-2">
                <Link
                  href={AUTH_FORM_ROUTES.forgotPassword}
                  className="inline-flex min-h-8 items-center text-[13px] font-medium text-primary transition-colors duration-150 hover:underline"
                >
                  {forgot.label}
                </Link>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="h-10 w-full font-semibold"
            >
              {isSubmitting ? formCopy.submittingLabel : formCopy.submitLabel}
            </Button>
          </form>

          {otherLinks.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-4 text-center">
              {otherLinks.map((link) => (
                <p key={link.key} className="text-[13px] text-muted-foreground">
                  {link.prefix ? `${link.prefix} ` : null}
                  <Link href={AUTH_FORM_ROUTES[link.key]} className="font-semibold text-primary hover:underline">
                    {link.label}
                  </Link>
                </p>
              ))}
            </div>
          )}
        </div>
      </main>
      <nav aria-label="Support and legal" className="mt-6 flex flex-wrap justify-center gap-x-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy policy</Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">Terms of use</Link>
      </nav>
    </div>
  );
}
