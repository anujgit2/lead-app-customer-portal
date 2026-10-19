# Tenant UI configuration

The portal loads one UI config per tenant. It covers the theme, the account forms (sign in, sign up, email code, forgot password, reset password), and the name of the landing page. Loan, profile, and document templates are a different config and are not part of this payload.

## Request

`GET {api host}/api/tenant/ui`

The browser sends this after the page hydrates, and the screen stays on a loading state until the response arrives. The portal does not send `X-Tenant-ID` on this request. The backend resolves the tenant from the API host. On a portal host under `NEXT_PUBLIC_TENANT_BASE_DOMAIN`, `{name}.einfra.local` calls `{name}-services.einfra.local` (for example `south.einfra.local` calls `south-services.einfra.local`). Every other host uses `NEXT_PUBLIC_API_URL`. A failed request or an invalid payload falls back to the built-in default config, and only then does the screen render.

## Payload

```json
{
  "ui": {
    "landingPage": "default",
    "theme": {
      "logoUrl": "https://cdn.example.com/leads/logo.svg",
      "logoAlt": "Lender name",
      "fontFamily": "Inter",
      "fontUrl": "https://cdn.example.com/fonts/brand.woff2",
      "borderRadius": "8px",
      "colors": {
        "primary": "#0F3D2E",
        "primaryForeground": "#FFFFFF",
        "background": "#F7F5F2",
        "foreground": "#1C1917",
        "card": "#FFFFFF",
        "muted": "#E7E5E4",
        "border": "#E7E5E4",
        "danger": "#B42318"
      }
    },
    "forms": {
      "signin": {},
      "signup": {},
      "otp": {},
      "forgotPassword": {},
      "resetPassword": {}
    }
  }
}
```

Omit anything that should stay on the portal default. Unknown keys are ignored.

## Landing page

`landingPage` is only a name. The portal renders the screen registered under that name. Any other name renders `default`.

To add a page, build the component and register it in `src/features/landing/registry.tsx`, then add the name to `LANDING_PAGE_NAMES` in `src/features/tenant-ui/landing-pages.ts`. Copy and layout live in that component, not in this config.

## Theme

Colors are `#RRGGBB`. The portal turns them into the CSS color tokens (`--primary`, `--background`, and the related button, card, and hero colors). `primaryForeground` is the text on primary buttons.

`fontFamily` is `Inter` or `system-ui`. Any other family is used only when `fontUrl` is an `https` font file. `borderRadius` is `0px`, `4px`, `8px`, or `12px`. `logoUrl` is either an `https` image address, or a file name such as `logo.svg`. A file name is loaded from `public/ui/` (served as `/ui/logo.svg`). `png`, `jpg`, `jpeg`, `webp`, and `svg` are accepted. If `logoUrl` is missing, or the image cannot be loaded, the portal shows the built-in mark. `logoAlt` is the name shown beside the image, or “LoanPortal” when it is missing.

## Forms

Each form may set `title`, `subtitle`, `submitLabel`, `submittingLabel`, `fields`, and `links`. Email verification also uses `resendLabel` and `resendCooldownSeconds` (0–300). Reset password also uses `successTitle` and `successSubtitle`. The OTP subtitle may include `{email}`; the portal replaces it with the masked address.

Field `key` and `type` must be one of these:

| Key | Type | Form |
|---|---|---|
| `identifier` | `text` | signin. Email or a 10-digit mobile number. |
| `fullName` | `text` | signup |
| `email` | `email` | signup, forgotPassword |
| `phone` | `tel` | signup |
| `password` | `password` | signin, signup |
| `newPassword`, `confirmPassword` | `password` | resetPassword |
| `otp` | `otp` | otp, resetPassword. Always 6 digits. |
| `rememberMe` | `checkbox` | signin. Hidden when omitted. |
| `acceptTerms` | `checkbox` | signup. Always kept. |

`width` is `full` or `half`. Link `key` is `signin`, `signup`, or `forgotPassword`. The portal chooses the route. A `prefix` is the sentence before the link.

Password rules, the email-or-mobile check, the sign-up captcha, and terms acceptance stay in the portal. Config changes labels, placeholders, field order, width, and which optional fields appear. If a payload drops a field the form cannot submit without, the portal puts the default field back.
