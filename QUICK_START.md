# Google Places Address Autocomplete — Quick Start Guide

## 5-Minute Setup

### 1. Create Google Cloud Project

Go to https://console.cloud.google.com/
- Create a new project
- Enable: **Places API** and **Maps JavaScript API**
- Create a **Browser API Key**
- Set HTTP referrer restrictions to your domain (e.g., `localhost:3000`)

### 2. Add API Key to `.env.local`

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 3. Start Dev Server

```bash
export PATH="/usr/local/opt/node@22/bin:$PATH"
npm run dev
```

### 4. Test It

- Go to a loan application form
- Find the address field
- Type: "42 MG Road"
- Select from suggestions
- All address fields auto-populate ✅

## What You'll See

```
┌─────────────────────────────────────────────┐
│ Address (Autocomplete Search)               │
│ ┌─────────────────────────────────────────┐ │
│ │ 42 MG Road                              │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔺 42 MG Road, Fort, Mumbai, M... │ ← Select
│ │ 🔺 MG Road, Fort, Mumbai, Maha... │
│ │ 🔺 MG Road, Fort, Mumbai, Maha... │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Address Line 1 *                            │
│ ┌─────────────────────────────────────────┐ │
│ │ 42 MG Road                              │ │ ← Auto-filled
│ └─────────────────────────────────────────┘ │
│                                             │
│ Address Line 2                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Fort                                    │ │ ← Auto-filled
│ └─────────────────────────────────────────┘ │
│                                             │
│ City *         │ State *                    │
│ ┌────────────┐ │ ┌─────────────────────┐   │
│ │ Mumbai     │ │ │ Maharashtra     ▼   │   │ ← Auto-filled
│ └────────────┘ │ └─────────────────────┘   │
│                                             │
│ PIN Code *     │ Country *                  │
│ ┌────────────┐ │ ┌─────────────────────┐   │
│ │ 400001     │ │ │ India           ▼   │   │ ← Auto-filled
│ └────────────┘ │ └─────────────────────┘   │
│                                             │
│ Powered by Google Places                    │
└─────────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Key | What It Does |
|-----|-------------|
| ↓ | Next suggestion |
| ↑ | Previous suggestion |
| Enter | Select highlighted |
| Esc | Close dropdown |

## Common Issues

### "API key is not configured"
```bash
# Add this to .env.local:
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
# Then restart: npm run dev
```

### No suggestions showing
- Type at least 3 characters
- Verify API key in Google Cloud Console
- Check referrer is added to allowed list

### High API bills
- Increase debounce (default 300ms → 500ms)
- Add minimum character length (default 3 → 4)

## Documentation

- **Full guide:** `docs/google-places-integration.md`
- **Usage examples:** `docs/address-autocomplete-usage.md`
- **Implementation details:** `IMPLEMENTATION_SUMMARY.md`

## Need Help?

See `docs/google-places-integration.md` → **Troubleshooting** section
