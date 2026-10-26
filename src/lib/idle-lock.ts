/** How long a signed-in user can go without input before the screen locks. */
export const IDLE_LOCK_MS = 5 * 60 * 1000;

export interface IdleLockState {
  locked: boolean;
  identifier: string;
  displayName: string;
  rememberMe: boolean;
}

const UNLOCKED: IdleLockState = {
  locked: false,
  identifier: "",
  displayName: "",
  rememberMe: true,
};

let state: IdleLockState = UNLOCKED;
const listeners = new Set<() => void>();

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/applications",
  "/profiles",
  "/profile",
  "/documents",
  "/loan-application",
];

export function isIdleLockPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function subscribeIdleLock(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getIdleLockState(): IdleLockState {
  return state;
}

export function getServerIdleLockState(): IdleLockState {
  return UNLOCKED;
}

export function isIdleLocked(): boolean {
  return state.locked;
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function beginIdleLock(next: Omit<IdleLockState, "locked">) {
  if (state.locked) return;
  state = { locked: true, ...next };
  emit();
}

export function endIdleLock() {
  if (!state.locked) return;
  state = UNLOCKED;
  emit();
}
