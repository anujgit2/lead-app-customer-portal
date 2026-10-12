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

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await authService.login(data);
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
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">Sign in</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Welcome back. Pick up your application where you left it.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identifier">Email or mobile number</Label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="you@example.com or 98765 43210"
            error={!!errors.email}
            aria-describedby={errors.email ? "identifier-err" : undefined}
            className="h-11 bg-background"
            startAdornment={<Mail className="h-4 w-4" />}
            {...register("email")}
          />
          <FieldError id="identifier-err">{errors.email?.message}</FieldError>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
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

        <div className="-mt-1 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="rememberMe" className="inline-flex cursor-pointer items-center gap-2 text-[13px] leading-5">
            <Checkbox
              id="rememberMe"
              checked={!!rememberMe}
              onCheckedChange={(value) => setValue("rememberMe", !!value)}
            />
            <span>Keep me signed in</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="inline-flex min-h-8 items-center text-[13px] font-medium text-primary transition-all duration-200 ease-out hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="lp-glow h-11 w-full font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-[13px] text-muted-foreground">
          New to LoanPortal?{" "}
          <Link href="/auth/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-xs leading-[18px] text-muted-foreground">
          Invited by a lender or agent? Open the link in your email instead. It takes you straight to your application.
        </p>
      </div>
    </AuthScreen>
  );
}
