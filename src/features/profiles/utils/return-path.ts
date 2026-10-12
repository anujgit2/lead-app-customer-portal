const ALLOWED_RETURN_PREFIXES = [
  "/dashboard",
  "/applications",
  "/loan-application",
  "/profiles",
  "/documents",
];

/** Keeps post-create navigation inside this app. */
export function safeInternalPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return null;
  if (/[\\\u0000-\u001f]/.test(value) || /%(2f|5c|00)/i.test(value)) return null;
  const path = value.split(/[?#]/)[0];
  const allowed = ALLOWED_RETURN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
  return allowed ? value : null;
}

export function withProfileReturn(
  returnTo: string,
  profileId: string,
  versionNo: number
): string {
  const [path, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);
  params.set("customerProfileId", profileId);
  params.set("customerProfileVersionNo", String(versionNo));
  return `${path}?${params.toString()}`;
}
