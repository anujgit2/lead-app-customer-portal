function configuredPublicUrl(): string {
  const value = process.env.APP_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_PUBLIC_URL ?? "";
  return value.trim().replace(/\/+$/, "");
}

export function shareTokenFromLocation(value: string): string | null {
  if (!value.trim()) return null;
  let pathname = value.trim();
  try {
    pathname = new URL(value, "https://app.invalid").pathname;
  } catch {
    return null;
  }
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.lastIndexOf("shared");
  const token = index >= 0 ? parts[index + 1] : "";
  if (!token) return null;
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

/** UI link for recipients. Uses APP_PUBLIC_URL only — never the API host or the sender's current origin. */
export function sharedRecipientUrl(token: string, appPublicUrl = configuredPublicUrl()): string {
  const safeToken = encodeURIComponent(token);
  const path = `/shared/${safeToken}/`;
  const base = appPublicUrl.trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : path;
}

export function toPublicShareLink(
  apiUrl: string,
  explicitToken?: string,
  appPublicUrl = configuredPublicUrl()
): string {
  const token = explicitToken?.trim() || shareTokenFromLocation(apiUrl);
  if (!token) return "";
  return sharedRecipientUrl(token, appPublicUrl);
}
