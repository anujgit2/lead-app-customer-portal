---
name: customer-portal-ui
description: Build or restyle any screen, form or component in the Customer Portal (Next.js) with the same compact design system as the Partner Portal. Use for forms (sign-in, sign-up, profile, loan application steps), notices, buttons, fields, cards or any UI change under src/features, src/components or src/app. Not for the public landing page.
---

# Customer Portal UI

The customer portal uses one design system, the same one as the partner portal: light, compact,
banking-grade. Forms and controls are built from the shared classes in `src/app/globals.css`
(`.btn`, `.field`, `.ap-input`, `.ap-check`, `.ap-notice`, `.card`, `.head`, `.pill`, `.muted`) and
the components in `src/components/portal/` and `src/components/ui/`. Write new CSS only when nothing
fits, and then add a generic `ap-*` class in `globals.css`, never a one-off.

Scope: applies to everything behind sign-in. The public landing page (`src/features/landing/`) is
marketing and keeps its own look.

## Ground rules

1. **Compact, not airy.** 13px body text, 34px controls (40px on sign-in and sign-up), 14–16px card
   padding, 12–16px gaps. Page title 20px/600. No `p-8`, `text-2xl` or `text-3xl` headings on app
   screens. Use `p-6 sm:p-8` only for the outer page padding.
2. **No motion gimmicks.** No hover lift (`hover:-translate-y-*`), no `active:scale-*`, no
   `active:translate-*`, no glow shadows on buttons. Hover changes background or border colour only.
   Use `transition-colors duration-150`.
3. **Icons are lucide-react only**, 14–17px, `aria-hidden="true"` next to visible text. Never emoji
   or text symbols as icons. Icon-only buttons need `aria-label`.
4. **Colours come from tokens**, never hex or `rgba()` in TSX (use `text-foreground`,
   `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`, `text-danger-strong`). Exception:
   the Loantris logo keeps its brand colours.
5. **Status is always a `.pill`** (`ok | warn | bad | info | neu`). Map statuses to tones in one
   helper per feature, never inline in JSX.
6. **One primary action per region.** Primary = `btn p` or the shadcn `Button` default. Everything
   else is `btn`, `btn soft` or a link. Submit buttons on forms are full width (`btn p full lg`).
7. **Every form and list has loading, error and empty states.** Show errors under the field with
   `.err` (or `FieldError`) and a page-level problem with `Notice tone="bad"`.
8. **Explain why a signed-out page appears** with a `Notice`, not a toast alone.
9. **Phone width works.** No horizontal page scroll; tables scroll inside `.scroll`. Check at 390px.
10. **Never break tests or flows when restyling.** Keep `data-testid`, `aria-label`s, button and link
    names, field `id`s, validation messages, and API calls. e2e specs in `e2e/` depend on them.

## Tokens (CSS variables in globals.css)

Brand palette (teal and blue, from the Loantris landing) stays. Component tokens use the partner
portal names and read from the brand palette, so the classes are identical in both portals.

| Token | Use |
|---|---|
| `--ap-bg` | page background |
| `--ap-surface` | cards, inputs, panels |
| `--ap-subtle` / `--ap-hover` | pressed and hover backgrounds |
| `--ap-border` / `--ap-border-strong` | card edge / input and button edge |
| `--ap-text` / `--ap-text-2` / `--ap-muted` | primary / secondary / helper text |
| `--ap-primary`, `--ap-primary-hover`, `--ap-primary-soft` | CTAs, links, soft buttons |
| `--ap-ok` `--ap-warn` `--ap-danger` `--ap-info` (+ `-soft`) | status colours |
| `--ap-shadow-sm/md/lg`, `--ap-focus` | elevation, focus ring |

shadcn components in `src/components/ui` read the matching HSL tokens (`--primary`, `--border`,
`--input`, `--radius`), so they already match.

## Class vocabulary

| Class | What it is |
|---|---|
| `.head` with `h1` + `p` | Page header: title, one-line description, actions on the right |
| `.btn`, `.btn.p`, `.btn.soft`, `.btn.sm`, `.btn.lg`, `.btn.full` | Secondary, primary, soft inline action, small, 40px large, full width |
| `.pill.ok/.warn/.bad/.info/.neu` | Status tag with dot |
| `.card` | White surface, 10px radius |
| `.muted` | Helper text colour |
| `.field` > `label` + `input/select/textarea` + `.err` | Form field with label and error text |
| `.ap-input` > icon + `input` (+ `button.ap-input-btn`) | Input with leading icon and optional show/hide button. Inside `.field` |
| `.ap-check` | One checkbox with its label, e.g. "Remember me" |
| `.ap-link-btn` | Quiet text button with icon, e.g. "Back to sign in" |
| `.ap-notice.info/ok/warn/bad` | Inline notice box (use `Notice`) |

## Components

| Component | Import | Use |
|---|---|---|
| `Notice` | `@/components/portal/Notice` | Inline message above a form: `tone`, `title`, `children`, `testId` |
| `AuthHeading` | `@/components/portal/AuthHeading` | Title + description at the top of a sign-in or sign-up form |
| `Button` | `@/components/ui/button` | shadcn primitive. Sizes: `sm` 28px, default 34px, `lg` 40px. `loading` shows a spinner |
| `Input` | `@/components/ui/input` | shadcn primitive, 36px. `startAdornment`/`endAdornment` for icons. Use `className="h-10"` for sign-in fields |
| `FieldError` | `@/features/auth/AuthScreen` | Field error text with icon, `id` for `aria-describedby` |
| `DynamicField` | `@/components/forms/DynamicField` | Loan-application and profile form engine. Field styling comes from `Input`, `Select`, `Textarea` |

## Recipe: sign-in or sign-up form

```tsx
<main className="auth-card card w-full max-w-[420px] p-6 sm:p-8">
  <AuthHeading title="Sign in" description="One line on what this is for." />
  {banner && <Notice tone={banner.tone} title={banner.title} testId="login-notice">{banner.body}</Notice>}
  <form onSubmit={…} className="flex flex-col gap-4" noValidate>
    <div className="field">
      <label htmlFor="identifier">Email or mobile</label>
      <div className="ap-input"><Mail aria-hidden="true" /><input id="identifier" aria-invalid={!!err} … /></div>
      {err && <span className="err">{err}</span>}
    </div>
    <Button type="submit" size="lg" loading={isSubmitting} className="h-10 w-full font-semibold">Sign in</Button>
  </form>
</main>
```

## Recipe: list or detail page

```tsx
<div className="head">
  <div><h1>Things</h1><p>One line on what this page is for.</p></div>
  <Link className="btn p" href="/things/new/"><Plus aria-hidden="true" />New thing</Link>
</div>
<div className="card">…</div>
```

Every list has loading, error, empty and no-match states.

## Before you finish

- [ ] No hex, rgba or hard-coded colours in changed TSX (brand logo excepted)
- [ ] No hover lift, press scale or glow on controls
- [ ] Loading, error and empty states present
- [ ] Icons from lucide with `aria-hidden`; icon-only buttons have `aria-label`; inputs have labels
- [ ] Checked at 390px wide: nothing overflows the page
- [ ] Existing `data-testid`, labels, `id`s and button names unchanged
- [ ] `npx tsc --noEmit`, `npm run lint` and `npm test` pass
