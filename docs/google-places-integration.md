# Google Places Address Autocomplete Integration

This document describes the Google Places Address Autocomplete feature integrated into the loan application customer portal.

## Overview

The address component now supports real-time address autocomplete using Google's Places API (New). When users type in the primary address field, they see suggestions from Google Places, and selecting a suggestion automatically populates all structured address fields (address line 1, address line 2, city, state, PIN code, country).

## Architecture

### Components

1. **Google Maps Loader** (`src/lib/google-maps-loader.ts`)
   - Handles lazy-loading the Google Maps JavaScript API
   - Caches the API instance to prevent duplicate loads
   - Provides error handling for missing API keys

2. **Address Autocomplete Utility** (`src/lib/address-autocomplete.ts`)
   - Fetches autocomplete suggestions using the Places Autocomplete Data API
   - Extracts structured address components from Google Place objects
   - Maps Google's address components to the portal's address fields
   - Manages session tokens for billing optimization

3. **Address Input Component** (`src/components/forms/AddressInputWithAutocomplete.tsx`)
   - Client-side React component with `"use client"` directive
   - Integrates with React Hook Form via `useFormContext`
   - Renders an input field with custom suggestion dropdown
   - Handles keyboard navigation (Arrow keys, Enter, Escape)
   - Dismisses dropdown on outside click
   - Shows loading states and error messages

4. **DynamicField Integration** (`src/components/forms/DynamicField.tsx`)
   - Updated to render the autocomplete component above structured address fields
   - Maintains backward compatibility with existing address field behavior
   - Allows manual address entry if autocomplete is unavailable

### Data Flow

```
┌─ User types in address input (e.g., "42 MG Road")
│
├─ onChange triggers (real-time)
│  └─ Invalidate stale place metadata if edited
│
├─ Debounce timer: 300ms
│  └─ Cancel previous debounce
│
├─ fetchAutocompleteSuggestions() 
│  └─ Call Google Places API with session token
│     ↓
│     Returns: AutocompletePrediction[]
│
├─ Render suggestions dropdown
│  └─ User sees 5-10 matching addresses
│
├─ User action: Click or press Enter
│  └─ selectedIndex → prediction
│
├─ extractAddressFromPrediction(prediction)
│  ├─ Call prediction.toPlace()
│  ├─ Call place.fetchFields(['addressComponents', 'formattedAddress', 'location'])
│  └─ Extract address components into AddressValue
│
├─ Map Google components to form fields:
│  ├─ street_number + route → addressLine1
│  ├─ locality / neighborhood → addressLine2
│  ├─ locality → city
│  ├─ administrative_area_level_1 → state
│  ├─ postal_code → pincode
│  └─ country → country
│
├─ useFormContext().setValue() for each field
│  └─ Update React Hook Form state
│
└─ Form re-renders with populated address fields
   └─ User can now edit any field or submit
```

## Configuration

### Environment Variables

Add to `.env.local`, `.env.dev`, `.env.uat`, `.env.prod`:

```bash
# Google Maps API Key for address autocomplete
# Get your key from: https://console.cloud.google.com/
# Restrict to: HTTP referrers (localhost:3000, localhost:3001, etc.)
# Enable APIs: Places API, Maps JavaScript API
# Never commit real keys to source control.
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

**Important:** This value is exposed to the browser (via `NEXT_PUBLIC_` prefix). Always restrict the API key:
1. In Google Cloud Console, set **API Key Restrictions** to:
   - **Application restrictions:** HTTP referrers
   - **Website restrictions:** Add `localhost:3000`, `localhost:3001` for dev; production domains for prod
2. **API restrictions:** Enable only `Places API` and `Maps JavaScript API`

### Google Cloud Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Places API (New)
   - Maps JavaScript API
3. Create a browser API key with HTTP referrer restrictions
4. Add the key to your environment files (never commit real keys)

## Address Field Behavior

### Default Behavior (No Autocomplete)
Users can manually enter address in structured fields:
- Address Line 1 (required)
- Address Line 2 (optional)
- City (required)
- State (required, dropdown)
- PIN Code (required, pattern validation)
- Country (required, dropdown)

### With Autocomplete
1. User types in the autocomplete input (primary address field)
2. After 3+ characters with 300ms debounce, suggestions appear
3. User selects a suggestion or continues typing
4. All structured fields are automatically populated
5. User can still manually edit any field after selection
6. If user manually edits the address after selection, place metadata (Place ID, coordinates) is invalidated

### Limitations & Fallbacks

- **Minimum input:** 3 characters required before API call
- **Suggestions timeout:** Network errors show a friendly message; user can retry
- **Manual entry:** Users can ignore autocomplete and manually enter addresses (no blocking)
- **Incomplete data:** If Google's address components are missing (e.g., district), the field stays empty and user can edit manually
- **Regional coverage:** Suggestions are restricted to India by default

## Address Component Mapping

Google's AddressComponent types are mapped to portal fields as follows:

| Portal Field | Google Component (Priority Order) |
|---|---|
| addressLine1 | street_number + route (combined), or formatted_address fallback |
| addressLine2 | sublocality_level_1, sublocality, neighborhood |
| city | locality, administrative_area_level_2 |
| state | administrative_area_level_1 |
| pincode | postal_code |
| country | country (defaults to "India") |

**Note:** Google's address component hierarchy is not consistent across every Indian address. Missing fields are preserved as empty values and can be edited manually.

## Keyboard Navigation

- **Arrow Down/Up:** Navigate through suggestions
- **Enter:** Select highlighted suggestion
- **Escape:** Close dropdown
- **Click outside:** Close dropdown

## State Management

The autocomplete integrates seamlessly with React Hook Form:
- Updates via `useFormContext().setValue()`
- Respects existing validation rules
- Preserves form state; only address fields are updated
- Manual edits invalidate stale place metadata

## API Usage & Billing

The integration uses Google's new Places API (v1) with the following billing considerations:

1. **Autocomplete Requests:** Uses `fetchAutocompleteSuggestions()` (billed per request)
2. **Place Details:** Uses `toPlace()` → `fetchFields()` (billed per request)
3. **Session Tokens:** Reduces cost by grouping suggestions + place details into single session billing unit
4. **Optimization:** Debouncing (300ms) and request cancellation reduce unnecessary API calls

### Estimated Cost
- **Small deployment (100 users/month, 5 suggestions/user):** ~$10–20
- **Medium deployment (1K users/month, 10 suggestions/user):** ~$50–100
- **Large deployment (10K users/month, 20 suggestions/user):** ~$500–1000

(Costs based on current Google pricing; verify in Console)

## Testing

Tests are located in `src/lib/address-autocomplete.test.ts` and cover:

- API loader success and failure
- Suggestion rendering and selection
- Address component extraction for Indian addresses
- Missing or incomplete components
- Manual address entry and editing
- Keyboard interaction
- Debouncing and stale request cancellation
- Form validation integration
- Component cleanup on unmount

Mock Google APIs in tests rather than making real API calls.

### Running Tests

```bash
npm test
```

## Accessibility

The component includes:
- Semantic HTML (input, role attributes)
- ARIA combobox/listbox patterns
- Keyboard navigation support
- Error messages and loading states
- Focus management on dropdown open/close

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Known Issues & Limitations

1. **Network dependency:** Requires internet connection for suggestions (works offline with manual entry)
2. **Rate limiting:** Google may rate-limit if too many requests from single IP
3. **Coverage gaps:** Some rural or newly developed areas may have limited data
4. **Component inconsistency:** Some Indian addresses may lack district or city; user edits required

## Security Considerations

- API key is exposed to browser but restricted by HTTP referrer in Google Console
- No sensitive user data is logged
- Address data is stored per existing backend contracts (never stores place IDs or coordinates unless form schema supports it)
- No server-side proxy required; client-side API calls are sufficient

## Migration & Backward Compatibility

- Existing address fields remain fully functional
- Autocomplete is opt-in (users can ignore it and use manual entry)
- No changes to form API contracts
- All existing validations and submission logic unchanged
- Existing address data is not affected

## Troubleshooting

### "Google Maps API key is not configured" Error
- Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in your environment file
- Verify the key is valid and not revoked in Google Cloud Console

### No suggestions appearing
- Check that Places API and Maps JavaScript API are enabled in Google Cloud Console
- Verify API key HTTP referrer restrictions include your domain
- Check browser console for CORS errors
- Type at least 3 characters

### Suggestions show but wrong address fields populate
- Check that address component types from Google match expected mapping
- Review logs in browser console for component extraction issues
- Verify form schema hasn't changed unexpected field names

### High API costs
- Increase debounce delay to reduce suggestion requests
- Review Google Cloud Console billing for unusual patterns
- Consider restricting address input character count before API call

## Future Enhancements

- [ ] Support multiple countries (configurable restriction bounds)
- [ ] Cache recent searches to reduce API calls
- [ ] Add reverse geocoding (click map to select address)
- [ ] Support address history (saved addresses)
- [ ] Integrate pincode-based city/state lookup as backup
- [ ] Implement server-side validation for selected places
- [ ] Add district extraction for Indian addresses (third-party lookup if needed)

## References

- [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Autocomplete Suggestions](https://developers.google.com/maps/documentation/places/web-service/suggestions)
- [Places Details](https://developers.google.com/maps/documentation/places/web-service/place-data-validation)
- [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)
- [React Hook Form Integration](https://react-hook-form.com/)
