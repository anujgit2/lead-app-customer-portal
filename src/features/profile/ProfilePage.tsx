"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Phone,
  Shield,
  Save,
  Mail,
  CheckCircle2,
  Loader2,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { formatDate, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import type { User as UserType } from "@/types";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const personalSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
});

const contactSchema = z.object({
  phone: z.string().regex(/^[+]?[\d\s\-().]{10,15}$/, "Invalid number"),
});

type PersonalFormData = z.infer<typeof personalSchema>;
type ContactFormData = z.infer<typeof contactSchema>;

// ─── Personal Tab ─────────────────────────────────────────────────────────────

function PersonalTab({ profile }: { profile: UserType | null }) {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PersonalFormData>({
      resolver: zodResolver(personalSchema),
      defaultValues: {
        firstName: profile?.firstName ?? "",
        lastName: profile?.lastName ?? "",
      },
    });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: PersonalFormData) => {
    try {
      const updated = await authService.updateProfile(data);
      setUser(updated);
      queryClient.setQueryData(["profile"], updated);
      toast.success("Personal information updated");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to update profile";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" error={!!errors.firstName} {...register("firstName")} />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" error={!!errors.lastName} {...register("lastName")} />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={profile?.email ?? ""}
            readOnly
            className="bg-muted/50 pr-28"
          />
          {profile?.emailVerified && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Contact Tab ──────────────────────────────────────────────────────────────

function ContactTab({ profile }: { profile: UserType | null }) {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ContactFormData>({
      resolver: zodResolver(contactSchema),
      defaultValues: { phone: profile?.phone ?? "" },
    });

  useEffect(() => {
    if (profile) reset({ phone: profile.phone ?? "" });
  }, [profile, reset]);

  const onSubmit = async (data: ContactFormData) => {
    try {
      const updated = await authService.updateContact({ phone: data.phone });
      setUser(updated);
      queryClient.setQueryData(["profile"], updated);
      toast.success("Contact information updated");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to update contact information";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="phone">Mobile Number</Label>
        <div className="relative">
          <Input
            id="phone"
            type="tel"
            error={!!errors.phone}
            className={profile?.phoneVerified ? "pr-28" : ""}
            {...register("phone")}
          />
          {profile?.phoneVerified && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab({ profile }: { profile: UserType | null }) {
  const [resetSent, setResetSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleForgotPassword = async () => {
    if (!profile?.email) return;
    setSending(true);
    try {
      await authService.forgotPassword(profile.email);
      setResetSent(true);
      toast.success("Password reset email sent. Check your inbox.");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to send reset email";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reset Password */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium">Password Reset</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            We&apos;ll send a password reset OTP to your email address.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm">{profile?.email ?? "—"}</span>
        </div>

        {resetSent ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Reset OTP sent. Check your inbox and enter the code on the reset page.
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={sending || !profile?.email}
            onClick={handleForgotPassword}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Send Password Reset Email
          </Button>
        )}
      </div>

      <Separator />

      {/* Security Preferences */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Security Preferences</h4>
        <div className="space-y-3">
          {[
            { label: "Two-factor authentication", desc: "Add an extra layer of security", defaultChecked: false },
            { label: "Login notifications", desc: "Get notified of new sign-ins", defaultChecked: true },
            { label: "Session timeout", desc: "Auto sign-out after 30 min of inactivity", defaultChecked: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch defaultChecked={item.defaultChecked} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Details Overview ─────────────────────────────────────────────────────────

function VerificationPill({ verified }: { verified?: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 shrink-0">
      <AlertCircle className="h-3.5 w-3.5" />
      Unverified
    </span>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  trailing,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate mt-0.5">{value}</p>
      </div>
      {trailing}
    </div>
  );
}

function ProfileOverview({ profile }: { profile: UserType | null }) {
  if (!profile) return null;

  let memberSince = "—";
  if (profile.createdAt) {
    try {
      memberSince = formatDate(profile.createdAt);
    } catch {
      memberSince = "—";
    }
  }

  const fullName = [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-base bg-primary text-white">
              {getInitials(profile.firstName, profile.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight truncate">
              {fullName || "—"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {profile.status && (
                <Badge variant={profile.status === "ACTIVE" ? "success" : "secondary"}>
                  {profile.status}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Member since {memberSince}
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid sm:grid-cols-2 sm:gap-x-8 divide-y sm:divide-y-0">
          <DetailRow
            icon={Mail}
            label="Email address"
            value={profile.email || "—"}
            trailing={<VerificationPill verified={profile.emailVerified} />}
          />
          <DetailRow
            icon={Phone}
            label="Mobile number"
            value={profile.phone || "Not added"}
            trailing={
              profile.phone ? (
                <VerificationPill verified={profile.phoneVerified} />
              ) : undefined
            }
          />
          <DetailRow
            icon={CalendarDays}
            label="Member since"
            value={memberSince}
          />
          <DetailRow icon={User} label="Account ID" value={profile.id || "—"} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user: storeUser, setUser } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (profile) setUser(profile);
  }, [profile, setUser]);

  const displayUser = profile ?? storeUser;

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal information and account settings
        </p>
      </div>

      {isLoading && !displayUser ? null : <ProfileOverview profile={displayUser} />}

      <Card>
        <CardContent className="p-6">
          {isLoading && !displayUser ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading profile…</span>
            </div>
          ) : (
            <Tabs defaultValue="personal">
              <TabsList className="mb-6">
                <TabsTrigger value="personal" className="gap-2">
                  <User className="h-3.5 w-3.5" />
                  Personal
                </TabsTrigger>
                <TabsTrigger value="contact" className="gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  Contact
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <PersonalTab profile={displayUser} />
              </TabsContent>
              <TabsContent value="contact">
                <ContactTab profile={displayUser} />
              </TabsContent>
              <TabsContent value="security">
                <SecurityTab profile={displayUser} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
