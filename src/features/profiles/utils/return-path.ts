/** Keeps post-create navigation inside this app. */
export function safeInternalPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) return null;
  return value;
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
