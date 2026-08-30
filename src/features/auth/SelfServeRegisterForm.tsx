"use client";

import React, { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  IS_RECAPTCHA_TEST_KEY,
  ReCaptcha,
  type ReCaptchaHandle,
} from "@/components/ReCaptcha";
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
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const captchaRef = useRef<ReCaptchaHandle>(null);

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

  const handleCaptchaChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
    if (token) setCaptchaError(false);
  }, []);

  const onSubmit = async (data: SignupFormData) => {
    if (!captchaToken) {
      setCaptchaError(true);
      toast.error("Please complete the human verification check");
      return;
    }

    const registerData: RegisterApiRequest = {
      email: data.email,
      phone: data.mobile,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      recaptchaToken: captchaToken,
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
      // A consumed token cannot be replayed, so force a fresh challenge.
      captchaRef.current?.reset();
      setCaptchaToken(null);
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Registration failed. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 mb-6 transition-all duration-200 ease-out hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Get matched with MSME loan and grant schemes in minutes
          </p>
        </div>

        <Card className="border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="Jane"
                    autoComplete="given-name"
                    error={!!errors.firstName}
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
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
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
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
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
                    <div className="grid grid-cols-2 gap-1">
                      {PASSWORD_RULES.map((rule) => (
                        <div
                          key={rule.label}
                          className={cn(
                            "flex items-center gap-1.5 text-xs",
                            rule.test(password) ? "text-green-600" : "text-slate-500"
                          )}
                        >
                          <div
                            className={cn(
                              "w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0",
                              rule.test(password) ? "bg-green-100" : "bg-muted"
                            )}
                          >
                            <Check className="h-2 w-2" />
                          </div>
                          {rule.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
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

              <div className="pt-1 space-y-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">
                    Human verification
                  </span>
                </div>
                <ReCaptcha ref={captchaRef} onChange={handleCaptchaChange} />
                {captchaError && !captchaToken && (
                  <p className="text-xs text-destructive">
                    Please confirm you are not a robot
                  </p>
                )}
                {IS_RECAPTCHA_TEST_KEY && (
                  <p className="text-xs text-amber-600">
                    Using Google&apos;s reCAPTCHA test key. Set
                    NEXT_PUBLIC_RECAPTCHA_SITE_KEY for production.
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="acceptTerms"
                  checked={!!acceptTerms}
                  onCheckedChange={(v) => setValue("acceptTerms", !!v)}
                />
                <Label
                  htmlFor="acceptTerms"
                  className="text-sm font-normal cursor-pointer leading-snug"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
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
                className="w-full gap-2 mt-2"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
