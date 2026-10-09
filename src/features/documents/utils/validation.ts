import { z } from "zod";
import type { CreateShareBody } from "../types";
import { toE164 } from "./phone";

export const shareFormSchema = z
  .object({
    recipientName: z.string().trim().min(1, "Enter the recipient's name").max(120, "Name is too long"),
    email: z
      .string()
      .trim()
      .min(1, "Enter an email address")
      .max(254, "Email is too long")
      .email("Enter a valid email address"),
    phone: z.string().trim().max(20),
    expiresInDays: z.enum(["1", "7", "30"]),
    allowDownload: z.boolean(),
    password: z.string().max(128),
  })
  .superRefine((value, ctx) => {
    if (value.phone && !toE164(value.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Enter a valid phone number",
      });
    }
    if (value.password && value.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Use at least 8 characters",
      });
    }
  });

export type ShareFormValues = z.infer<typeof shareFormSchema>;

export const SHARE_FORM_DEFAULTS: ShareFormValues = {
  recipientName: "",
  email: "",
  phone: "",
  expiresInDays: "7",
  allowDownload: true,
  password: "",
};

export function toSharePayload(value: ShareFormValues): CreateShareBody {
  return {
    recipientName: value.recipientName.trim(),
    email: value.email.trim() || undefined,
    phone: value.phone.trim() ? (toE164(value.phone) ?? undefined) : undefined,
    expiresInDays: Number(value.expiresInDays) as 1 | 7 | 30,
    allowDownload: value.allowDownload,
    password: value.password ? value.password : undefined,
  };
}

export const CONTACT_REQUIRED_MESSAGE = "Enter an email address";
