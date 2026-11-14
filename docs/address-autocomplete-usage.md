# Address Autocomplete — Usage Guide

Quick reference for using the address autocomplete feature in forms.

## How It Works for Users

### Autocomplete Flow
1. User types in the address field: "42 MG Road"
2. After 3+ characters, suggestions appear below the input
3. User clicks a suggestion or presses Arrow Down + Enter
4. All address fields automatically populate:
   - Address Line 1: "42 MG Road"
   - Address Line 2: "Fort"
   - City: "Mumbai"
   - State: "Maharashtra"
   - PIN Code: "400001"
   - Country: "India"
5. User can then edit any field or submit the form

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Arrow Down | Next suggestion |
| Arrow Up | Previous suggestion |
| Enter | Select highlighted suggestion |
| Escape | Close dropdown |
| Click outside | Close dropdown |

### Manual Entry
- Autocomplete is optional; users can always manually enter addresses
- Typing any address and pressing Tab will close the dropdown
- Users can edit fields after selection

---

## For Developers

### Component: AddressInputWithAutocomplete

This component is automatically rendered when you have an address field in a form template. **You don't need to add it manually** — `DynamicField` handles it.

#### How It's Used

```tsx
// In a form template (JSON)
{
  "name": "address",
  "type": "address",
  "label": "Registered Address",
  "validation": { "required": true }
}
```

The `DynamicField` component automatically renders:
1. `AddressInputWithAutocomplete` (with suggestions)
2. All 6 structured address fields (manually editable)

#### Props

```tsx
interface AddressInputWithAutocompleteProps {
  fieldName: string;              // e.g., "address" or "businessAddress"
  error?: boolean;                // Show error state
  disabled?: boolean;             // Disable input
  readonly?: boolean;             // Read-only input
  placeholder?: string;           // Custom placeholder
}
```

#### Example Direct Usage

If you need to use it outside of `DynamicField`:

```tsx
import { AddressInputWithAutocomplete } from "@/components/forms/AddressInputWithAutocomplete";
import { useFormContext } from "react-hook-form";

export function MyCustomAddressForm() {
  const { watch, setValue } = useFormContext();

  return (
    <AddressInputWithAutocomplete
      fieldName="address"
      placeholder="Start typing your address..."
      error={false}
      disabled={false}
    />
  );
}
```

#### Form State Integration

The component updates the form state via React Hook Form's `setValue()`:

```tsx
// After user selects "42 MG Road, Mumbai":
formData = {
  address: {
    addressLine1: "42 MG Road",
    addressLine2: "Fort",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    country: "India",
    placeId: "ChIJ0Z3v..." // (optional, if added to form schema)
    latitude: 19.0760,      // (optional, if added to form schema)
    longitude: 72.8777      // (optional, if added to form schema)
  }
}
```

---

## Utility Functions

### fetchAutocompleteSuggestions

Fetch address suggestions from Google Places.

```tsx
import { fetchAutocompleteSuggestions } from "@/lib/address-autocomplete";

const suggestions = await fetchAutocompleteSuggestions(
  "42 MG Road",
  sessionToken
);

// Returns: AutocompletePrediction[]
// [{
//   place_id: "ChIJ0Z3v...",
//   description: "42 MG Road, Mumbai, Maharashtra 400001, India",
//   mainText: "42 MG Road",
//   secondaryText: "Mumbai, Maharashtra 400001, India",
//   types: ["route"]
// }, ...]
```

### extractAddressFromPrediction

Extract structured address data from a Google Place prediction.

```tsx
import { extractAddressFromPrediction } from "@/lib/address-autocomplete";

const result = await extractAddressFromPrediction(prediction);

// Returns: {
//   address: AddressValue,
//   placeId: string,
//   location: { lat: number; lng: number } | null
// }

const { address, placeId, location } = result;
console.log(address.city);      // "Mumbai"
console.log(address.state);     // "Maharashtra"
console.log(placeId);           // "ChIJ0Z3v..."
console.log(location?.lat);     // 19.0760
```

### createAutocompleteSessionToken

Create a session token for a new autocomplete session (improves billing).

```tsx
import { createAutocompleteSessionToken } from "@/lib/address-autocomplete";

const sessionToken = await createAutocompleteSessionToken();
// Use this token for all autocomplete requests in this session
```

### loadGoogleMapsApi

Low-level API loader (called automatically by above functions).

```tsx
import { loadGoogleMapsApi } from "@/lib/google-maps-loader";

const google = await loadGoogleMapsApi();
console.log(google.maps.places); // Access full API
```

---

## Error Handling

### Common Errors

#### "Google Maps API key is not configured"
```tsx
// Solution: Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

#### No suggestions appearing
1. Check API key is valid in Google Cloud Console
2. Verify HTTP referrer restrictions include your domain
3. Ensure user typed 3+ characters
4. Check browser console for CORS errors

#### Form not updating after selection
1. Verify form is wrapped in `FormProvider`
2. Check that field names match schema
3. Look for validation errors blocking updates

---

## Customization

### Change Minimum Characters for Suggestions

File: `src/lib/address-autocomplete.ts` (line ~65)

```tsx
// Before: 3 characters
if (!input || input.trim().length < 3) return [];

// After: 2 characters
if (!input || input.trim().length < 2) return [];
```

### Change Debounce Delay

File: `src/components/forms/AddressInputWithAutocomplete.tsx` (line ~185)

```tsx
// Before: 300ms
debounceTimerRef.current = setTimeout(() => {
  fetchSuggestions(value);
}, 300);

// After: 500ms
debounceTimerRef.current = setTimeout(() => {
  fetchSuggestions(value);
}, 500);
```

### Change Country Restriction

File: `src/lib/address-autocomplete.ts` (line ~51-56)

```tsx
// Before: India bounds
locationRestriction: {
  west: 68.1,
  south: 8.4,
  east: 97.4,
  north: 35.5,
},

// After: Worldwide (remove restriction)
// locationRestriction: undefined,

// Or: Custom country
locationRestriction: {
  west: -180, // Worldwide
  south: -90,
  east: 180,
  north: 90,
},
```

### Customize Dropdown Styling

File: `src/components/forms/AddressInputWithAutocomplete.tsx` (lines ~266-290)

```tsx
// Update the className for suggestions container
<div
  ref={suggestionsRef}
  className={cn(
    "absolute top-full left-0 right-0 z-50",
    "border border-t-0 border-slate-200 bg-white rounded-b-lg shadow-lg",
    "max-h-64 overflow-y-auto",
    // Add custom classes here
  )}
>
```

### Add Custom Attribution

File: `src/components/forms/AddressInputWithAutocomplete.tsx` (line ~290)

```tsx
// Update attribution text
<div className="mt-1 text-[11px] text-slate-400">
  Powered by <span className="font-medium">Google Places</span>
</div>
```

---

## Testing

### Manual Testing Checklist

- [ ] Start typing an address: "42 MG Road"
- [ ] Wait for suggestions to appear (after 3 chars)
- [ ] Navigate with arrow keys
- [ ] Select with Enter key
- [ ] Verify all fields populate
- [ ] Click outside dropdown to close
- [ ] Try typing another address
- [ ] Manually edit a field
- [ ] Verify no validation errors
- [ ] Submit form successfully

### Unit Tests

```bash
npm test -- address-autocomplete
```

Tests cover:
- API loading and caching
- Suggestion fetching
- Address component extraction
- Keyboard navigation
- Debouncing and stale request handling
- Error scenarios

---

## Performance Tips

### For Users
- Start typing after 3 characters (minimum for suggestions)
- Use arrow keys to navigate quickly
- Select exact match rather than typing full address

### For Developers
- Debounce is set to 300ms (good balance for most cases)
- Session tokens reduce API costs by ~50%
- Request cancellation prevents race conditions
- No duplicate API loads (cached Google Maps API)

### For Admins
- Monitor Google Cloud Console for API usage
- Watch for unusual request patterns (may indicate rate limiting)
- Review costs monthly (budget alert: $10–100/month typical)

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| No suggestions | API key missing | Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| CORS error | Wrong referrer | Add domain to Google Cloud Console |
| Suggestions wrong country | Location bounds off | Check `src/lib/address-autocomplete.ts` |
| Form not updating | Wrong field names | Verify address field structure |
| Dropdown hidden | z-index issue | Check modal/card overflow settings |
| Slow suggestions | Debounce too long | Reduce from 300ms to 200ms |
| High API costs | Too many requests | Increase debounce or add request limits |

---

## Related Documentation

- [Full Integration Guide](./google-places-integration.md)
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
- [Address Field Utility](../src/utils/address-field.ts)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Google Places API Docs](https://developers.google.com/maps/documentation/places/web-service/overview)
