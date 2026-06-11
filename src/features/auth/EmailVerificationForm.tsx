"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { invitationService } from "@/services/invitation.service";
import { toast } from "sonner";
import type { RegisterApiRequest } from "@/types";
import { useRouter } from "next/navigation";

const otpSchema = z.object({
  otp: z
    .string()
    .min(4, "Enter the verification code")
    .max(8, "Invalid verification code")
    .regex(/^\d+$/, "Verification code must contain only numbers"),
});

type OtpFormData = z.infer<typeof otpSchema>;

interface EmailVerificationFormProps {
  userId: string;
  email: string;
  registerData: RegisterApiRequest;
}

export function EmailVerificationForm({
  userId,
  email,
  registerData,
}: EmailVerificationFormProps) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  const onSubmit = async (data: OtpFormData) => {
    setIsVerifying(true);
    try {
      const result = await authService.verifyEmailOtp({
        userId,
        otp: data.otp,
      });

      if (!result.verified) {
        toast.error(result.message || "Verification failed. Please try again.");
        return;
      }

      if (result.accessToken) {
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", result.accessToken);
        }
      }

      const authResult = await authService.completeRegistration(
        registerData,
        userId
      );
      setUser(authResult.user);
      invitationService.clearStoredInvitation();
      toast.success(result.message || "Email verified successfully!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Verification failed. Please try again.";
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Verify your email</h1>
          <p className="text-muted-foreground text-sm mt-1">
            We sent a verification code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <Card className="border-0 shadow-xl shadow-gray-100/50">
          <CardContent className="p-8">
            <div className="mb-6 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
              <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Enter the OTP from your email to activate your account and continue
                to your dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit code"
                  maxLength={8}
                  error={!!errors.otp}
                  className="text-center text-lg tracking-widest"
                  {...register("otp")}
                />
                {errors.otp && (
                  <p className="text-xs text-destructive">{errors.otp.message}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                loading={isVerifying}
                className="w-full gap-2"
              >
                Verify &amp; continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
