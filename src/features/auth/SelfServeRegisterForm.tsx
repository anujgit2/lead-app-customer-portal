"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { authService } from "@/services/auth.service";
import { cn, getPasswordStrength } from "@/lib/utils";
import { toast } from "sonner";
import type { RegisterApiRequest } from "@/types";

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    email: z.string().email("Enter a valid email"),
    mobile: z
      .string()
      .regex(/^[+]?[\d\s\-().]{10,15}$/, "Enter a valid mobile number"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include one uppercase letter")
      .regex(/[0-9]/, "Include one number")
      .regex(/[^A-Za-z0-9]/, "Include one special character"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

const PASSWORD_RULES = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "1 uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 number", test: (p: string) => /[0-9]/.test(p) },
  { label: "1 special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const BENEFITS = [
  {
    icon: Target,
    title: "Personalized matches",
    description: "Find schemes that fit your business",
  },
  {
    icon: Sparkles,
    title: "Simple application",
    description: "A faster, easier way to apply",
  },
  {
    icon: ShieldCheck,
    title: "Secure & confidential",
    description: "Your information is always protected",
  },
];

const GROWTH_BARS = [38, 52, 34, 68, 48, 82, 62];

interface SelfServeRegisterFormProps {
  onSuccess: (result: {
    userId: string;
    registerData: RegisterApiRequest;
    emailVerificationPending: boolean;
    accessToken: string | null;
  }) => void;
}

export function SelfServeRegisterForm({ onSuccess }: SelfServeRegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: false },
  });

  const password = watch("password") ?? "";
  const acceptTerms = watch("acceptTerms");
  const strength = getPasswordStrength(password);

  const onSubmit = async (data: SignupFormData) => {
    const registerData: RegisterApiRequest = {
      email: data.email,
      phone: data.mobile,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
    };

    try {
      const res = await authService.registerSelfServe(registerData);
      toast.success(res.message || "Account created successfully!");
      onSuccess({
        userId: res.userId,
        registerData,
        emailVerificationPending: res.emailVerificationPending,
        accessToken: res.accessToken,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Registration failed. Please try again.";
      toast.error(message);
    }
  };

  const inputClassName =
    "h-12 rounded-[0.6rem] border-slate-200 bg-white hover:border-slate-300 focus-visible:ring-4 focus-visible:ring-blue-500/15 focus-visible:border-blue-400 transition-all duration-200 ease-out";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 flex flex-col">
      <header className="w-full px-6 sm:px-10 lg:px-16 pt-6 lg:pt-8 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-transform duration-200 ease-out group-hover:-translate-y-0.5">
            <Building2 className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-semibold text-slate-900 tracking-tight hidden sm:inline">
            LoanPortal
          </span>
        </Link>
        <p className="text-sm text-slate-500">
          <span className="hidden sm:inline">Already have an account? </span>
          <Link
            href="/auth/login"
            className="font-semibold text-primary transition-colors duration-200 ease-out hover:text-primary/80 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </header>

      <main className="flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: value proposition */}
          <div className="hidden lg:flex flex-col max-w-lg">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-xs font-semibold tracking-widest text-primary uppercase">
                Funding a stronger tomorrow
              </span>
            </div>

            <h1 className="text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-slate-900 leading-[1.1] mb-5">
              Get matched with the right opportunities.
            </h1>

            <p className="text-base text-slate-600 leading-relaxed mb-10 max-w-md">
              Create your account and access MSME loan and grant schemes
              designed to help your business grow.
            </p>

            <div className="space-y-5 mb-10">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {benefit.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-blue-100/80 bg-white/70 backdrop-blur-sm p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Approval readiness
                  </p>
                  <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                    92%
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-600 text-xs font-semibold px-2.5 py-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +18%
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {GROWTH_BARS.map((height, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex-1 rounded-t-md transition-all duration-300",
                      index === GROWTH_BARS.length - 2
                        ? "bg-primary"
                        : "bg-blue-100"
                    )}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: registration form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
            <Card className="border border-slate-200 rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-slate-100">
              <CardContent className="p-8 sm:p-10">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 mb-5">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Create your account
                </h1>
                <p className="text-slate-500 text-sm mt-1.5 mb-8">
                  Get matched with MSME loan and grant schemes in minutes.
                </p>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                  noValidate
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        placeholder="Jane"
                        autoComplete="given-name"
                        error={!!errors.firstName}
                        startAdornment={<User className="h-4 w-4" />}
                        className={inputClassName}
                        {...register("firstName")}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-destructive">
                          {errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        autoComplete="family-name"
                        error={!!errors.lastName}
                        startAdornment={<User className="h-4 w-4" />}
                        className={inputClassName}
                        {...register("lastName")}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-destructive">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      error={!!errors.email}
                      startAdornment={<Mail className="h-4 w-4" />}
                      className={inputClassName}
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mobile">Mobile number</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="+91 98765 43210"
                      autoComplete="tel"
                      error={!!errors.mobile}
                      startAdornment={<Phone className="h-4 w-4" />}
                      className={inputClassName}
                      {...register("mobile")}
                    />
                    {errors.mobile && (
                      <p className="text-xs text-destructive">{errors.mobile.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      error={!!errors.password}
                      startAdornment={<Lock className="h-4 w-4" />}
                      className={inputClassName}
                      endAdornment={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 transition-colors duration-200 ease-out hover:text-slate-700"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                      {...register("password")}
                    />

                    {password && (
                      <div className="flex items-center gap-2 pt-1">
                        <Progress
                          value={(strength.score / 6) * 100}
                          className={cn(
                            "h-1 flex-1",
                            strength.score >= 4
                              ? "[&>div]:bg-green-500"
                              : strength.score >= 3
                                ? "[&>div]:bg-yellow-500"
                                : "[&>div]:bg-red-500"
                          )}
                        />
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {strength.label}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1.5">
                      {PASSWORD_RULES.map((rule) => {
                        const passed = rule.test(password);
                        return (
                          <div
                            key={rule.label}
                            className={cn(
                              "flex items-center gap-1.5 text-xs transition-colors duration-200 ease-out",
                              passed ? "text-green-600" : "text-slate-400"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ease-out",
                                passed
                                  ? "border-green-500 bg-green-50"
                                  : "border-slate-300 bg-white"
                              )}
                            >
                              {passed && <Check className="h-2.5 w-2.5" />}
                            </span>
                            {rule.label}
                          </div>
                        );
                      })}
                    </div>

                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      error={!!errors.confirmPassword}
                      startAdornment={<Lock className="h-4 w-4" />}
                      className={inputClassName}
                      endAdornment={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-slate-400 transition-colors duration-200 ease-out hover:text-slate-700"
                          aria-label={
                            showConfirmPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      }
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <Checkbox
                      id="acceptTerms"
                      checked={!!acceptTerms}
                      onCheckedChange={(v) => setValue("acceptTerms", !!v)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor="acceptTerms"
                      className="text-sm font-normal cursor-pointer leading-snug text-slate-600"
                    >
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="font-semibold text-primary hover:underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="font-semibold text-primary hover:underline"
                      >
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                  {errors.acceptTerms && (
                    <p className="text-xs text-destructive -mt-2">
                      {errors.acceptTerms.message}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    loading={isSubmitting}
                    className="w-full gap-2 h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 hover:-translate-y-0.5 mt-2"
                  >
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
