/**
 * Type definitions for Google Maps JavaScript API (Places API)
 * These are partial definitions covering the APIs used for address autocomplete.
 *
 * For full type definitions, install @types/google.maps package.
 */

declare namespace google.maps {
  namespace places {
    /**
     * A prediction result from the Autocomplete service.
     */
    interface AutocompletePrediction {
      place_id: string;
      description: string;
      main_text: string;
      mainText: string;
      secondary_text?: string;
      secondaryText?: string;
      matched_substrings?: Array<{
        length: number;
        offset: number;
      }>;
      types?: string[];
      toPlace(): Promise<Place | null>;
    }

    /**
     * Represents a place retrieved from the Places API.
     */
    interface Place {
      id: string;
      displayName: string;
      formattedAddress?: string;
      addressComponents?: AddressComponent[];
      location?: LatLng;
      fetchFields(options: FetchFieldsRequest): Promise<void>;
    }

    /**
     * A single address component.
     */
    interface AddressComponent {
      long_name: string;
      short_name?: string;
      types: string[];
    }

    /**
     * Request object for fetchFields.
     */
    interface FetchFieldsRequest {
      fields: Array<
        | "id"
        | "displayName"
        | "formattedAddress"
        | "addressComponents"
        | "location"
      >;
    }

    /**
     * Session token for improving autocomplete UX and billing.
     */
    class AutocompleteSessionToken {
      constructor();
    }

    /**
     * Options for fetching autocomplete suggestions.
     */
    interface FetchAutocompleteSuggestionsRequest {
      input: string;
      locationRestriction?: {
        west: number;
        south: number;
        east: number;
        north: number;
      };
      includedPrimaryTypes?: string[];
      sessionToken?: AutocompleteSessionToken;
    }

    /**
     * Response from fetchAutocompleteSuggestions.
     */
    interface FetchAutocompleteSuggestionsResponse {
      suggestions: AutocompletePrediction[];
    }

    /**
     * AutocompleteSuggestion class for fetching predictions.
     */
    class AutocompleteSuggestion {
      static fetchAutocompleteSuggestions(
        request: FetchAutocompleteSuggestionsRequest
      ): Promise<FetchAutocompleteSuggestionsResponse>;
    }
  }

  /**
   * Represents a latitude/longitude coordinate.
   */
  interface LatLng {
    lat(): number;
    lng(): number;
  }
}
