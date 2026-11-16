const UNKNOWN_BUILD_LABEL = "Build unknown";
const SHORT_SHA_LENGTH = 7;

/**
 * Formats the footer build label from the commit SHA baked in at build time.
 * A full 40-char SHA gives "Build <first 7 chars>". Empty, missing or
 * whitespace-only input gives "Build unknown".
 */
export function formatBuildLabel(sha?: string | null): string {
  const trimmed = (sha ?? "").trim();
  if (!trimmed) return UNKNOWN_BUILD_LABEL;
  return `Build ${trimmed.slice(0, SHORT_SHA_LENGTH)}`;
}
