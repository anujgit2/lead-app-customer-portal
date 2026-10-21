# TODO

Open items from the BFSI code review of the consent field and program-driven profiles (commit `cb671f1` and the follow-up fixes). See `docs/consent-field.md` for the consent contract.

## Verify the follow-up fixes

- [ ] Run `src/utils/consent.test.ts` and `src/features/profiles/profile-logic.test.ts`.
- [ ] Typecheck and lint.
- [ ] Manually check a consent section in the loan wizard and in profile create: "Accept required" leaves optional consents unticked, server-recorded consents stay locked, and Continue appears only in the wizard.

## Backend contract

- [ ] `POST /api/customer-profiles` accepts `programId`. Until it does, profile creation may fail if unknown fields are rejected.
- [ ] Reject a consent `version` that is not the published version of that field for the program.
- [ ] Recompute `textHash` from the published wording for the submitted `locale`; store the server value and log mismatches.
- [ ] Treat a missing consent key in a save as "keep the existing record", never as a withdrawal.
- [ ] Withdrawal API (append-only row with `withdrawnAt`), then link it from the "Recorded" note on locked consents.
- [ ] Encrypt consent audit rows at rest; keep wording and values out of plain-text logs.

## Profile type field

- [ ] Backend sends a fixed `profileType` (`INDIVIDUAL` | `BUSINESS`) on PROFILE programs.
- [ ] Replace the `programType.includes("BUSINESS")` guess in `profileTypeForProgram` (`src/features/profiles/constants.ts`) with that field, and refuse programs with a missing or unknown value.
- [ ] Server checks that the submitted profile `type` matches the program's `profileType`.

## Compliance sign-off

- [ ] Confirm with compliance that "Accept required" (bulk tick of required consents only) meets DPDP / RBI digital lending expectations, or remove bulk accept entirely.
- [ ] Decide which locales consent wording must be offered in; today `<html lang>` is always `en`, so other translations are never shown.

## Infra: custom nginx error page

- [ ] Add a self-contained (inline CSS, no external assets) `errors/502.html` on the nginx host, e.g. `/usr/share/nginx/html/errors/502.html`.
- [ ] In the `server` block, set `error_page 502 503 504 /errors/502.html;` with an `internal` location for it, and `proxy_intercept_errors on;` plus a short `proxy_connect_timeout` on the app `location`.
- [ ] For `/api/`, return a JSON 503 (`error_page 502 503 504 = @api_down;`) instead of HTML so Axios error handling keeps working.
- [ ] If nginx runs in Docker, copy or mount the error page; if using ingress-nginx, use `custom-http-errors` with a default backend instead.
- [ ] Run `nginx -t`, reload, and test by stopping the app and API containers.

## Existing risks (not from this change)

- [ ] Loan drafts, including consent values and customer data, are persisted in plain-text localStorage by `useWizardStore`. Move to server-only drafts or session storage cleared on logout.

## Cleanup

- [ ] Move `business-profile.json` and `individual-profile.json` out of the repo root (fixtures or docs), or delete them.
- [ ] Dev playground `sameSnapshot` uses `JSON.stringify`, so `File` uploads don't refresh the inspector.
- [ ] Review the widened `allowedDevOrigins` (`*.bizloandev.local`) in `next.config.ts`.
- [ ] Add payload-builder tests for `application.service.ts` and `profile-data.ts` (consents end to end) and mapper tests for consent parsing in `program-mapper` / `template-mapper`.
