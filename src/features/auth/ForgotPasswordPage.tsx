"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";
import { AUTH_FORM_ROUTES } from "@/features/tenant-ui/form-routes";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";
import { AuthScreen } from "@/features/auth/AuthScreen";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const resetSchema = z
  .object({
    otp: z
      .string()
      .min(4, "Enter the reset code")
      .max(8, "Invalid reset code")
      .regex(/^\d+$/, "Reset code must contain only numbers"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include one uppercase letter")
      .regex(/[0-9]/, "Include one number")
      .regex(/[^A-Za-z0-9]/, "Include one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RequestFormData = z.infer<typeof requestSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { config } = useTenantUi();
  const requestCopy = config.forms.forgotPassword;
  const resetCopy = config.forms.resetPassword;
  const emailField = requestCopy.fields.find((field) => field.key === "email");
  const otpField = resetCopy.fields.find((field) => field.key === "otp");
  const newPasswordField = resetCopy.fields.find((field) => field.key === "newPassword");
  const confirmField = resetCopy.fields.find((field) => field.key === "confirmPassword");
  const backLink = requestCopy.links.find((link) => link.key === "signin");
  const successLink = resetCopy.links.find((link) => link.key === "signin");

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const requestCode = async (data: RequestFormData) => {
    try {
      await authService.forgotPassword(data.email);
      setEmail(data.email);
      setCodeSent(true);
      setResetComplete(false);
      toast.success("If the account exists, a reset OTP has been sent.");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Unable to send reset code.";
      toast.error(message);
    }
  };

  const resetPassword = async (data: ResetFormData) => {
    try {
      await authService.resetPassword({
        identifier: email,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      setResetComplete(true);
      resetForm.reset();
      toast.success("Password reset successfully. You can sign in now.");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Unable to reset password.";
      toast.error(message);
    }
  };

  return (
    <AuthScreen variant="card">
      <Link
        href={AUTH_FORM_ROUTES.signin}
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-[#6487a2] transition-opacity hover:opacity-80"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {backLink?.label ?? "Back to sign in"}
      </Link>

      <div>
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-[#0f2030]">
          {codeSent ? resetCopy.title : requestCopy.title}
        </h1>
        <p className="mt-1 text-sm leading-6 text-[#4e6373]">
          {codeSent ? resetCopy.subtitle : requestCopy.subtitle}
        </p>
      </div>

      <form onSubmit={requestForm.handleSubmit(requestCode)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{emailField?.label ?? "Email address"}</Label>
          <Input
            id="email"
            type="email"
            placeholder={emailField?.placeholder}
            autoComplete="email"
            error={!!requestForm.formState.errors.email}
            className="h-11 bg-background"
            {...requestForm.register("email")}
          />
          {requestForm.formState.errors.email && (
            <p className="text-xs text-danger-strong">{requestForm.formState.errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          variant={codeSent ? "outline" : "default"}
          loading={requestForm.formState.isSubmitting}
          className="h-11 w-full gap-2 font-semibold"
        >
          <Mail className="h-4 w-4" />
          {requestForm.formState.isSubmitting ? requestCopy.submittingLabel : requestCopy.submitLabel}
        </Button>
      </form>

      {codeSent && (
        <form
          onSubmit={resetForm.handleSubmit(resetPassword)}
          className="flex flex-col gap-4 border-t border-[#dfe8ee] pt-5"
          noValidate
        >
          <Alert variant="info" role="status">
            <AlertDescription>
              Enter the OTP sent to <span className="font-medium">{email}</span>.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp">{otpField?.label ?? "OTP"}</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              className="h-11 bg-background text-center text-lg tracking-widest"
              error={!!resetForm.formState.errors.otp}
              {...resetForm.register("otp")}
            />
            {resetForm.formState.errors.otp && (
              <p className="text-xs text-danger-strong">{resetForm.formState.errors.otp.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">{newPasswordField?.label ?? "New password"}</Label>
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              error={!!resetForm.formState.errors.newPassword}
              className="h-11 bg-background"
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...resetForm.register("newPassword")}
            />
            {resetForm.formState.errors.newPassword && (
              <p className="text-xs text-danger-strong">{resetForm.formState.errors.newPassword.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">{confirmField?.label ?? "Confirm password"}</Label>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              error={!!resetForm.formState.errors.confirmPassword}
              className="h-11 bg-background"
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...resetForm.register("confirmPassword")}
            />
            {resetForm.formState.errors.confirmPassword && (
              <p className="text-xs text-danger-strong">{resetForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" size="lg" loading={resetForm.formState.isSubmitting} className="h-11 w-full font-semibold">
            {resetForm.formState.isSubmitting ? resetCopy.submittingLabel : resetCopy.submitLabel}
          </Button>
        </form>
      )}

      {resetComplete && (
        <Alert variant="success" role="status">
          <CheckCircle2 aria-hidden />
          <AlertDescription>
            {resetCopy.successTitle || "Password reset complete."}{" "}
            {resetCopy.successSubtitle ? `${resetCopy.successSubtitle} ` : null}
            <Link href={AUTH_FORM_ROUTES.signin} className="font-medium underline">
              {successLink?.label ?? "Sign in"}
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </AuthScreen>
  );
}
