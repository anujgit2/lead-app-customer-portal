"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { authService } from "@/services/auth.service";
import { getPasswordStrength } from "@/lib/utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { InvitationDetails, RegisterApiRequest } from "@/types";
import {
  AuthScreen,
  SignInLink,
  SIGN_UP_POINTS,
  signUpAside,
} from "@/features/auth/AuthScreen";

const registerSchema = z
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

type RegisterFormData = z.infer<typeof registerSchema>;

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function parseOwnerName(name?: string): { firstName: string; lastName: string } {
  if (!name?.trim()) return { firstName: "", lastName: "" };
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

interface RegisterFormProps {
  invitation: InvitationDetails;
  invitationToken: string;
  onSuccess: (result: {
    userId: string;
    registerData: RegisterApiRequest;
    emailVerificationPending: boolean;
    accessToken: string | null;
  }) => void;
}

export function RegisterForm({
  invitation,
  invitationToken,
  onSuccess,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const ownerName = parseOwnerName(invitation.preFilledData?.primaryOwnerName);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
      email: invitation.invitedEmail,
      mobile: invitation.invitedPhone,
      firstName: ownerName.firstName,
      lastName: ownerName.lastName,
    },
  });

  const password = watch("password") ?? "";
  const acceptTerms = watch("acceptTerms");
  const strength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    const registerData: RegisterApiRequest = {
      email: data.email,
      phone: data.mobile,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      invitationToken,
    };

    try {
      const res = await authService.registerWithInvitation(registerData);
      toast.success(res.message || "Registration successful!");
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

  return (
    <AuthScreen
      topRight={<SignInLink />}
      asideTitle={signUpAside.title}
      asideDescription={signUpAside.description}
      points={SIGN_UP_POINTS}
      contentClassName="max-w-[420px]"
    >
      <div>
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">Create your account</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Complete registration to start your loan application.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Jane"
                    error={!!errors.firstName}
                    autoComplete="given-name"
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    error={!!errors.lastName}
                    autoComplete="family-name"
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  error={!!errors.email}
                  autoComplete="email"
                  readOnly
                  className="bg-muted/50"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="+91 98765 43210"
                  error={!!errors.mobile}
                  autoComplete="tel"
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
                  error={!!errors.password}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
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
                        className={cn("h-1 flex-1", strength.score >= 4 ? "[&>div]:bg-green-500" : strength.score >= 3 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500")}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {strength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {PASSWORD_RULES.map((rule) => (
                        <div
                          key={rule.label}
                          className={cn(
                            "flex items-center gap-1.5 text-xs",
                            rule.test(password)
                              ? "text-green-600"
                              : "text-muted-foreground"
                          )}
                        >
                          <div
                            className={cn(
                              "w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0",
                              rule.test(password)
                                ? "bg-green-100"
                                : "bg-muted"
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  error={!!errors.confirmPassword}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
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

              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="acceptTerms"
                  checked={!!acceptTerms}
                  onCheckedChange={(v) => setValue("acceptTerms", !!v)}
                />
                <Label htmlFor="acceptTerms" className="text-sm font-normal cursor-pointer leading-snug">
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
                className="mt-1 lp-glow h-11 w-full font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
    </AuthScreen>
  );
}
