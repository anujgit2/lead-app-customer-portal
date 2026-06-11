"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Phone,
  Shield,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

const personalSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
});

const contactSchema = z.object({
  mobile: z.string().regex(/^[+]?[\d\s\-().]{10,15}$/, "Invalid number"),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

const securitySchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Uppercase letter required")
      .regex(/[0-9]/, "Number required"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PersonalFormData = z.infer<typeof personalSchema>;
type ContactFormData = z.infer<typeof contactSchema>;
type SecurityFormData = z.infer<typeof securitySchema>;

function PersonalTab() {
  const { user, setUser } = useAuthStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PersonalFormData>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
    },
  });

  const onSubmit = async (data: PersonalFormData) => {
    const updated = await authService.updateProfile(data);
    setUser(updated);
    toast.success("Personal information updated");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4 pb-2">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg bg-primary text-white">
            {user ? getInitials(user.firstName, user.lastName) : "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Separator />

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
        <Input id="email" type="email" error={!!errors.email} {...register("email")} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
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

function ContactTab() {
  const { user } = useAuthStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { mobile: user?.mobile ?? "" },
  });

  const onSubmit = async (_data: ContactFormData) => {
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Contact information updated");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input id="mobile" type="tel" error={!!errors.mobile} {...register("mobile")} />
          {errors.mobile && (
            <p className="text-xs text-destructive">{errors.mobile.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alternatePhone">Alternate Phone</Label>
          <Input id="alternatePhone" type="tel" placeholder="Optional" {...register("alternatePhone")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" placeholder="Street address" {...register("address")} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="City" {...register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" placeholder="State" {...register("state")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pincode">PIN Code</Label>
          <Input id="pincode" placeholder="400001" {...register("pincode")} />
        </div>
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

function SecurityTab() {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SecurityFormData>({
    resolver: zodResolver(securitySchema),
  });

  const toggle = (key: string) =>
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));

  const onSubmit = async (_data: SecurityFormData) => {
    await new Promise((r) => setTimeout(r, 1000));
    toast.success("Password updated successfully");
    reset();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type={showPasswords.current ? "text" : "password"}
            error={!!errors.currentPassword}
            endAdornment={
              <button type="button" onClick={() => toggle("current")} className="text-muted-foreground">
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type={showPasswords.new ? "text" : "password"}
            error={!!errors.newPassword}
            endAdornment={
              <button type="button" onClick={() => toggle("new")} className="text-muted-foreground">
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type={showPasswords.confirm ? "text" : "password"}
            error={!!errors.confirmPassword}
            endAdornment={
              <button type="button" onClick={() => toggle("confirm")} className="text-muted-foreground">
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={isSubmitting} className="gap-2">
            <Shield className="h-4 w-4" />
            Update Password
          </Button>
        </div>
      </form>

      <Separator />

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

export function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your personal information and account settings
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
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
              <PersonalTab />
            </TabsContent>
            <TabsContent value="contact">
              <ContactTab />
            </TabsContent>
            <TabsContent value="security">
              <SecurityTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
