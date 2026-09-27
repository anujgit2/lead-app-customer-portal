"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Sparkles,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

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
    defaultValues: { rememberMe: false },
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
          <span className="hidden sm:inline">Don&apos;t have an account? </span>
          <Link
            href="/auth/register"
            className="font-semibold text-primary transition-colors duration-200 ease-out hover:text-primary/80 hover:underline"
          >
            Create one
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
              Welcome back to your funding journey.
            </h1>

            <p className="text-base text-slate-600 leading-relaxed mb-10 max-w-md">
              Sign in to track applications, manage documents, and stay on
              top of the MSME loan and grant schemes matched to your
              business.
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

          {/* Right: login form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
            <Card className="border border-slate-200 rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-slate-100">
              <CardContent className="p-8 sm:p-10">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 mb-5">
                  <LogIn className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Welcome back
                </h1>
                <p className="text-slate-500 text-sm mt-1.5 mb-8">
                  Sign in to your LoanPortal account to continue.
                </p>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                  noValidate
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs font-semibold text-primary transition-colors duration-200 ease-out hover:text-primary/80 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      autoComplete="current-password"
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
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id="rememberMe"
                      checked={!!rememberMe}
                      onCheckedChange={(v) => setValue("rememberMe", !!v)}
                    />
                    <Label
                      htmlFor="rememberMe"
                      className="text-sm font-normal cursor-pointer text-slate-600"
                    >
                      Remember me for 30 days
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    loading={isSubmitting}
                    className="w-full gap-2 h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 hover:-translate-y-0.5 mt-2"
                  >
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                  Received an invitation? Use the link in your email to
                  create your account.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
