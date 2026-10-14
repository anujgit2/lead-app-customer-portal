"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, FileText, History, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import {
  AuthScreen,
  BackHomeLink,
  FieldError,
  type BrandPoint,
} from "@/features/auth/AuthScreen";
import { checkFields, FieldStack, inputFields } from "@/features/tenant-ui/FieldStack";
import { AUTH_FORM_ROUTES } from "@/features/tenant-ui/form-routes";
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

const POINTS: BrandPoint[] = [
  {
    icon: FileText,
    title: "Saved as you go",
    description: "Stop any time and continue from the same place.",
  },
  {
    icon: History,
    title: "A profile with history",
    description: "Every change is remembered and can be reviewed.",
  },
  {
    icon: ShieldCheck,
    title: "Private until you share",
    description: "Only you decide who sees your documents.",
  },
];

export function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { config } = useTenantUi();
  const formCopy = config.forms.signin;
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  const rememberMe = watch("rememberMe");
  const inputs = inputFields(formCopy.fields);
  const remember = checkFields(formCopy.fields).find((field) => field.key === "rememberMe");
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
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-all duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-[0.98]"
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
      const res = await authService.login({
        ...data,
        rememberMe: remember ? data.rememberMe : false,
      });
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

  return (
    <AuthScreen
      topRight={<BackHomeLink />}
      asideTitle="Pick up where you left off."
      asideDescription="Your application, profile and documents are saved to your account and ready on any device."
      points={POINTS}
    >
      <div>
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">{formCopy.title}</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{formCopy.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FieldStack fields={inputs} render={renderInput} />

        {(remember || forgot) && (
          <div className="-mt-1 flex flex-wrap items-center justify-between gap-2">
            {remember ? (
              <label htmlFor="rememberMe" className="inline-flex cursor-pointer items-center gap-2 text-[13px] leading-5">
                <Checkbox
                  id="rememberMe"
                  checked={!!rememberMe}
                  onCheckedChange={(value) => setValue("rememberMe", !!value)}
                />
                <span>{remember.label}</span>
              </label>
            ) : (
              <span />
            )}
            {forgot && (
              <Link
                href={AUTH_FORM_ROUTES.forgotPassword}
                className="inline-flex min-h-8 items-center text-[13px] font-medium text-primary transition-all duration-200 ease-out hover:underline"
              >
                {forgot.label}
              </Link>
            )}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="lp-glow h-11 w-full font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {isSubmitting ? formCopy.submittingLabel : formCopy.submitLabel}
        </Button>
      </form>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        {otherLinks.map((link) => (
          <p key={link.key} className="text-[13px] text-muted-foreground">
            {link.prefix ? `${link.prefix} ` : null}
            <Link href={AUTH_FORM_ROUTES[link.key]} className="font-semibold text-primary hover:underline">
              {link.label}
            </Link>
          </p>
        ))}
        <p className="text-xs leading-[18px] text-muted-foreground">
          Invited by a lender or agent? Open the link in your email instead. It takes you straight to your application.
        </p>
      </div>
    </AuthScreen>
  );
}
