/**
 * Google Places Address Autocomplete utilities
 * Handles fetching suggestions and extracting structured address data from Google Place objects.
 */

import { loadGoogleMapsApi } from "@/lib/google-maps-loader";
import type { AddressValue } from "@/utils/address-field";

/**
 * Address component mapping from Google's AddressComponent to Indian address fields.
 * Multiple possible keys are supported to handle inconsistent Google data.
 */
interface AddressComponentMap {
  addressLine1: string[];
  addressLine2: string[];
  locality: string[];
  city: string[];
  district: string[];
  state: string[];
  postalCode: string[];
  country: string[];
}

const COMPONENT_MAP: AddressComponentMap = {
  addressLine1: ["street_number", "route"],
  addressLine2: ["sublocality_level_1", "sublocality", "neighborhood"],
  locality: ["sublocality_level_1", "sublocality", "locality"],
  city: ["locality", "administrative_area_level_2"],
  district: ["administrative_area_level_2"],
  state: ["administrative_area_level_1"],
  postalCode: ["postal_code"],
  country: ["country"],
};

/**
 * Session token for Places API (improves billing and suggestions)
 * Should be created fresh for each autocomplete session.
 */
class AutocompleteSessionToken {
  private token: google.maps.places.AutocompleteSessionToken | null = null;

  async initialize(): Promise<void> {
    if (this.token) return;
    const google = await loadGoogleMapsApi();
    this.token = new google.maps.places.AutocompleteSessionToken();
  }

  getToken(): google.maps.places.AutocompleteSessionToken | null {
    return this.token;
  }
}

/**
 * Fetch address autocomplete suggestions from Google Places API.
 *
 * @param input - User-entered search text
 * @param sessionToken - Optional session token for billing optimization
 * @returns Array of autocomplete suggestions
 * @throws Error if the API is not available or fails
 */
export async function fetchAutocompleteSuggestions(
  input: string,
  sessionToken?: google.maps.places.AutocompleteSessionToken
): Promise<google.maps.places.AutocompletePrediction[]> {
  if (!input || input.trim().length < 3) {
    return [];
  }

  try {
    const google = await loadGoogleMapsApi();

    const suggestions =
      await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: input.trim(),
        locationRestriction: {
          // Restrict to India (approximately)
          west: 68.1,
          south: 8.4,
          east: 97.4,
          north: 35.5,
        },
        includedPrimaryTypes: ["street_address", "premise", "geocode"],
        sessionToken,
      });

    return suggestions.suggestions || [];
  } catch (error) {
    console.error("Failed to fetch autocomplete suggestions:", error);
    return [];
  }
}

/**
 * Get a new session token for autocomplete requests.
 * Should be created once per autocomplete session for better billing.
 *
 * @returns New session token
 */
export async function createAutocompleteSessionToken(): Promise<google.maps.places.AutocompleteSessionToken> {
  const sessionToken = new AutocompleteSessionToken();
  await sessionToken.initialize();
  const token = sessionToken.getToken();
  if (!token) {
    throw new Error("Failed to create autocomplete session token");
  }
  return token;
}

/**
 * Fetch place details and return structured address components.
 *
 * @param prediction - Autocomplete prediction from Google Places
 * @returns Extracted address data mapped to AddressValue fields, or null if extraction fails
 */
export async function extractAddressFromPrediction(
  prediction: google.maps.places.AutocompletePrediction
): Promise<{ address: AddressValue; placeId: string; location: { lat: number; lng: number } | null } | null> {
  try {
    const google = await loadGoogleMapsApi();

    // Get the Place ID from the prediction
    const placeId = prediction.place_id;
    if (!placeId) {
      console.error("No place_id in prediction");
      return null;
    }

    // Fetch full place details
    const place = await prediction.toPlace();
    if (!place) {
      console.error("Failed to convert prediction to place");
      return null;
    }

    // Fetch additional fields
    await place.fetchFields({
      fields: [
        "id",
        "formattedAddress",
        "addressComponents",
        "location",
      ],
    });

    // Extract structured address from components
    const address = extractAddressComponents(place.addressComponents || [], place.formattedAddress);

    return {
      address,
      placeId,
      location: place.location
        ? {
            lat: place.location.lat(),
            lng: place.location.lng(),
          }
        : null,
    };
  } catch (error) {
    console.error("Failed to extract address from prediction:", error);
    return null;
  }
}

/**
 * Map Google AddressComponent array to our AddressValue structure.
 * Handles Indian address formats with fallback strategies for missing components.
 *
 * @param components - Array of Google AddressComponent objects
 * @param formattedAddress - Full formatted address as fallback for line 1
 * @returns AddressValue object with extracted/mapped fields
 */
function extractAddressComponents(
  components: google.maps.places.AddressComponent[],
  formattedAddress?: string
): AddressValue {
  // Build a map of component type → value for easy lookup
  const componentMap = new Map<string, string>();
  for (const component of components) {
    const longName = component.long_name;
    if (longName) {
      // For primary types, store with priority (first occurrence wins)
      for (const primaryType of component.types) {
        if (!componentMap.has(primaryType)) {
          componentMap.set(primaryType, longName);
        }
      }
    }
  }

  // Extract fields using priority-based lookup
  const extractField = (keys: string[]): string => {
    for (const key of keys) {
      const value = componentMap.get(key);
      if (value) return value;
    }
    return "";
  };

  // Line 1: street_number + route or fallback to formatted address
  const streetNumber = componentMap.get("street_number") || "";
  const route = componentMap.get("route") || "";
  const addressLine1 =
    (streetNumber && route ? `${streetNumber} ${route}` : streetNumber || route).trim() ||
    (formattedAddress ? formattedAddress.split(",")[0].trim() : "");

  // Line 2: locality/area/neighborhood
  const addressLine2 = extractField(COMPONENT_MAP.addressLine2);

  // Locality (for reference, used in line 2)
  const locality = extractField(COMPONENT_MAP.locality);

  // City: try locality first (common for India), then administrative_area_level_2
  const cityOptions = [
    componentMap.get("locality"),
    componentMap.get("administrative_area_level_2"),
  ];
  const city = cityOptions.find((c) => c?.trim())?.trim() || "";

  // State
  const state = extractField(COMPONENT_MAP.state);

  // PIN Code
  const pincode = extractField(COMPONENT_MAP.postalCode);

  // Country: use full name
  const country = extractField(COMPONENT_MAP.country);

  return {
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    country: country || "India", // Default to India if not found
  };
}
