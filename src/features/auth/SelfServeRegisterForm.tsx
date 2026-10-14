"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Check, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services/auth.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RegisterApiRequest } from "@/types";
import {
  FieldError,
  meterColor,
  passwordMeter,
} from "@/features/auth/AuthScreen";
import { DEFAULT_TENANT_UI } from "@/features/tenant-ui/default-ui-config";
import { checkFields, FieldStack, inputFields } from "@/features/tenant-ui/FieldStack";
import { AUTH_FORM_ROUTES } from "@/features/tenant-ui/form-routes";
import { useTenantUi } from "@/features/tenant-ui/TenantUiProvider";
import type { UiFormField } from "@/features/tenant-ui/types";

const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .refine((value) => value.split(/\s+/).length >= 2, "Enter your first and last name."),
  email: z.string().trim().email("Enter a valid email address, like name@example.com."),
  mobile: z
    .string()
    .trim()
    .refine(
      (value) => /^[6-9]\d{9}$/.test(value.replace(/[\s-]/g, "")),
      "Enter a 10-digit Indian mobile number."
    ),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Z]/, "Include one uppercase letter.")
    .regex(/[0-9]/, "Include one number.")
    .regex(/[^A-Za-z0-9]/, "Include one special character."),
  captcha: z.boolean().refine((value) => value, "Confirm that you are not a robot."),
  acceptTerms: z.boolean().refine((value) => value, "Accept the terms to continue."),
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SelfServeRegisterFormProps {
  onSuccess: (result: {
    userId: string;
    registerData: RegisterApiRequest;
    emailVerificationPending: boolean;
    accessToken: string | null;
  }) => void;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function SelfServeRegisterForm({ onSuccess }: SelfServeRegisterFormProps) {
  const { config } = useTenantUi();
  const formCopy = config.forms.signup;
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { captcha: false, acceptTerms: false, fullName: "", email: "", mobile: "", password: "" },
  });

  const password = watch("password") ?? "";
  const acceptTerms = watch("acceptTerms");
  const captcha = watch("captcha");
  const strength = passwordMeter(password);
  const inputs = inputFields(formCopy.fields);
  const terms = checkFields(formCopy.fields).find((field) => field.key === "acceptTerms");
  const defaultTerms = DEFAULT_TENANT_UI.forms.signup.fields.find((field) => field.key === "acceptTerms")?.label;
  const links = formCopy.links.filter((link) => link.key === "signin" || link.key === "forgotPassword");

  const renderInput = (field: UiFormField) => {
    if (field.key === "fullName") {
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-name">
            {field.label}
            {field.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          </Label>
          <Input
            id="su-name"
            type="text"
            autoComplete="name"
            placeholder={field.placeholder}
            required={field.required}
            error={!!errors.fullName}
            className="h-11 bg-background"
            startAdornment={<User className="h-4 w-4" />}
            {...register("fullName")}
          />
          <FieldError>{errors.fullName?.message}</FieldError>
        </div>
      );
    }

    if (field.key === "email") {
      return (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="su-email">
            {field.label}
            {field.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          </Label>
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            placeholder={field.placeholder}
            required={field.required}
            error={!!errors.email}
            className="h-11 bg-background"
            startAdornment={<Mail className="h-4 w-4" />}
            {...register("email")}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
      );
    }

    if (field.key === "phone") {
      return (
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="su-mobile">
            {field.label}
            {field.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          </Label>
          <Input
            id="su-mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={field.placeholder}
            required={field.required}
            error={!!errors.mobile}
            className="h-11 bg-background pl-[46px] tabular-nums"
            startAdornment={<span className="text-sm font-medium">+91</span>}
            {...register("mobile")}
          />
          <FieldError>{errors.mobile?.message}</FieldError>
        </div>
      );
    }

    if (field.key !== "password") return null;

    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="su-password">
          {field.label}
          {field.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </Label>
        <Input
          id="su-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder={field.placeholder}
          required={field.required}
          error={!!errors.password}
          aria-describedby="su-pw-meter"
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
        <div id="su-pw-meter" className="flex items-center gap-2.5">
          <div aria-hidden className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  strength.level >= bar ? meterColor(strength.level) : "bg-border"
                )}
              />
            ))}
          </div>
          <span aria-live="polite" className="min-w-[52px] text-right text-xs font-medium text-muted-foreground">
            {strength.label}
          </span>
        </div>
        {errors.password ? (
          <FieldError>{errors.password.message}</FieldError>
        ) : (
          <p className="text-xs leading-[18px] text-muted-foreground">
            Use upper and lower case, a number and a symbol.
          </p>
        )}
      </div>
    );
  };

  const onSubmit = async (data: SignupFormData) => {
    const name = splitName(data.fullName);
    const digits = data.mobile.replace(/[\s-]/g, "");
    const registerData: RegisterApiRequest = {
      email: data.email.trim(),
      phone: `+91${digits}`,
      firstName: name.firstName,
      lastName: name.lastName,
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.035em] text-foreground">{formCopy.title}</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{formCopy.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FieldStack fields={inputs} render={renderInput} />

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            role="checkbox"
            aria-checked={!!captcha}
            onClick={() => setValue("captcha", !captcha, { shouldValidate: !!errors.captcha })}
            className={cn(
              "flex h-14 w-full items-center justify-between gap-3 rounded-md border px-3.5 text-left text-[13px] transition-all duration-200 ease-out hover:border-foreground/55 active:scale-[0.98]",
              errors.captcha
                ? "border-danger/60 bg-danger-soft"
                : "border-input bg-muted"
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-[5px] border-2 text-white transition-all duration-200",
                  captcha ? "border-success bg-success" : "border-input bg-card"
                )}
              >
                {captcha && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
              </span>
              I am not a robot
            </span>
            <span className="text-right text-[10px] leading-3 text-muted-foreground">
              reCAPTCHA
              <br />
              Privacy · Terms
            </span>
          </button>
          <FieldError>{errors.captcha?.message}</FieldError>
        </div>

        {terms && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acceptTerms" className="inline-flex cursor-pointer items-start gap-2 text-[13px] leading-5">
              <Checkbox
                id="acceptTerms"
                checked={!!acceptTerms}
                onCheckedChange={(value) => setValue("acceptTerms", !!value, { shouldValidate: !!errors.acceptTerms })}
                aria-invalid={!!errors.acceptTerms}
                className="mt-px"
              />
              {terms.label === defaultTerms ? (
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="font-medium text-primary hover:underline">
                    Terms of use
                  </Link>{" "}
                  and the{" "}
                  <Link href="/privacy" className="font-medium text-primary hover:underline">
                    Privacy policy
                  </Link>
                  .
                </span>
              ) : (
                <span>{terms.label}</span>
              )}
            </label>
            <FieldError>{errors.acceptTerms?.message}</FieldError>
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

        {links.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {links.map((link) => (
              <p key={link.key} className="text-[13px] text-muted-foreground">
                {link.prefix ? `${link.prefix} ` : null}
                <Link href={AUTH_FORM_ROUTES[link.key]} className="font-semibold text-primary hover:underline">
                  {link.label}
                </Link>
              </p>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
