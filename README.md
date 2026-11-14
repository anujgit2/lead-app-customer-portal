This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Base URL for the backend API. A trailing `/accounts` is the user-service context path: login, registration, profile, password, and tenant UI use it, and other API calls use the host without that suffix. | 
| `NEXT_PUBLIC_TENANT_BASE_DOMAIN` | local multi-tenant hosts | When the page host is `{name}` under this domain, API calls go to `{name}-services.{domain}` so the backend host route selects the tenant. |
| `NEXT_PUBLIC_APP_PUBLIC_URL` | yes for shared links | Public portal origin used in copied share links (`https://portal.example.com`). Never the API host. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | production | reCAPTCHA v2 ("I'm not a robot") site key used by the human check on self-serve signup. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | optional (address autocomplete) | Google Maps API key for address autocomplete in address fields. Restrict to HTTP referrers in Google Cloud Console. See [Google Places Integration](./docs/google-places-integration.md). |

This app builds as a static export (`output: "export"` in `next.config.ts`) — there is no Next.js server at runtime, so `NEXT_PUBLIC_*` vars are baked into the JS bundle at build time and the browser calls the backend directly. **Changing an environment's backend URL always requires a rebuild.**

### Building for different environments

| File | Committed? | Loaded by |
|---|---|---|
| `.env.local` | No (personal, gitignored) | `npm run dev` (highest priority override) |
| `.env.development` | Yes | `npm run dev` (default) / `npm run build:dev` |
| `.env.uat` | Yes (placeholder value) | `npm run build:uat` |
| `.env.production` | Yes | `npm run build` / `npm run build:prod` |

```bash
npm run dev          # local dev server — uses .env.local, falls back to .env.development
npm run build:dev    # static build targeting the shared AWS dev backend
npm run build:uat    # static build targeting UAT (edit .env.uat first, or use CI)
npm run build:prod   # static build targeting production
npm run start         # serve the built ./out folder locally (after any build above)
```

Real CI/CD deployments (`.github/workflows/*.yml`) don't read the committed `.env.uat`/`.env.production` files — they inject the real backend URL as a Docker `--build-arg NEXT_PUBLIC_API_URL=...` from GitHub Actions secrets/variables, so production URLs never need to live in the repo.

Create a reCAPTCHA site key at the [reCAPTCHA admin console](https://www.google.com/recaptcha/admin), choosing **reCAPTCHA v2 → "I'm not a robot" Checkbox**, and add every host you serve from (including `localhost` for local work):

```bash
# .env.local
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
```

If the variable is unset, signup falls back to Google's public test key so the flow stays clickable locally. That key accepts everyone, so it must not reach production.

The signup form only obtains the token. **The matching secret key must be verified server side** via `https://www.google.com/recaptcha/api/siteverify` on the `/accounts/auth/register` endpoint — the client-side widget alone blocks nothing. The token is sent to the API as `recaptchaToken`.

### Google Places Address Autocomplete

To enable address autocomplete in address fields, create a Google Maps API key at the [Google Cloud Console](https://console.cloud.google.com/):

1. Create a new project or select an existing one
2. Enable the **Places API** and **Maps JavaScript API**
3. Create a browser API key
4. Set **API Key Restrictions** to **HTTP referrers** and add your deployment domains (e.g., `localhost:3000` for local, `portal.example.com` for production)
5. Add the key to your environment file:

```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Important:** This key is exposed to the browser but restricted by HTTP referrer in Google Cloud Console. Never commit real keys to the repository. See [Google Places Integration](./docs/google-places-integration.md) for detailed setup and troubleshooting.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_
medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
