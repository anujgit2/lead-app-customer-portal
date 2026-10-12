/**
 * Demo login and mock-data fallbacks. Off unless NEXT_PUBLIC_ENABLE_DEMO=true,
 * which must never be set in .env.uat/.env.prod.
 */
export function isDemoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";
}
