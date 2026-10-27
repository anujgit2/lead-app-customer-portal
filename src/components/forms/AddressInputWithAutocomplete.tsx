"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, AlertCircle } from "lucide-react";
import {
  fetchAutocompleteSuggestions,
  extractAddressFromPrediction,
  createAutocompleteSessionToken,
} from "@/lib/address-autocomplete";
import type { AddressValue } from "@/utils/address-field";

interface AddressInputWithAutocompleteProps {
  fieldName: string;
  error?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
}

/**
 * Address input component with Google Places autocomplete integration.
 * Renders a text input with suggestions dropdown for address selection.
 * Updates the parent form's address fields when a suggestion is selected.
 *
 * Requires:
 * - Parent FormProvider (from react-hook-form)
 * - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable
 */
export function AddressInputWithAutocomplete({
  fieldName,
  error,
  disabled,
  readonly,
  placeholder = "Enter your address",
}: AddressInputWithAutocompleteProps) {
  const { watch, setValue, control } = useFormContext();

  // Local state for autocomplete UI
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Refs for cleanup and debouncing
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousInputRef = useRef<string>("");

  // Get current form address value to track Place ID invalidation
  const currentAddressValue = watch(fieldName) as Partial<AddressValue> | undefined;
  const currentPlaceIdRef = useRef<string | null>(null);

  // Initialize session token on mount
  useEffect(() => {
    const initializeSessionToken = async () => {
      try {
        console.log("[AddressAutocomplete] Initializing session token...");
        sessionTokenRef.current = await createAutocompleteSessionToken();
        console.log("[AddressAutocomplete] Session token initialized successfully");
      } catch (err) {
        console.warn("[AddressAutocomplete] Failed to initialize autocomplete session token:", err);
        // Continue without session token
      }
    };
    initializeSessionToken();
  }, []);

  // Fetch suggestions with debouncing
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!input || input.trim().length < 3) {
        setSuggestions([]);
        setIsOpen(false);
        setHasError(false);
        return;
      }

      // Abort previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setHasError(false);
      previousInputRef.current = input;

      try {
        const results = await fetchAutocompleteSuggestions(
          input,
          sessionTokenRef.current || undefined
        );
        // Only update if this is not a stale request
        if (previousInputRef.current === input && !abortControllerRef.current.signal.aborted) {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.name !== "AbortError"
        ) {
          console.error("Autocomplete error:", err);
          setHasError(true);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Log component mount
  useEffect(() => {
    console.log("[AddressAutocomplete] Component mounted for field:", fieldName);
  }, [fieldName]);

  // Debounced input change handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      console.log("[AddressAutocomplete] Input changed:", value);

      // Invalidate placed-based metadata if user edits the address manually
      if (currentPlaceIdRef.current && value !== previousInputRef.current) {
        currentPlaceIdRef.current = null;
      }

      // Clear suggestions if input is empty
      if (!value.trim()) {
        setSuggestions([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        return;
      }

      // Debounce API request (300ms)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    },
    [fetchSuggestions]
  );

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    async (prediction: google.maps.places.AutocompletePrediction) => {
      setIsLoading(true);
      setIsOpen(false);
      setSuggestions([]);

      try {
        const result = await extractAddressFromPrediction(prediction);
        if (result) {
          const { address, placeId, location } = result;

          // Track the place ID so we know coordinates/place metadata is valid
          currentPlaceIdRef.current = placeId;

          // Update all address fields in the form
          setValue(`${fieldName}.addressLine1`, address.addressLine1);
          setValue(`${fieldName}.addressLine2`, address.addressLine2);
          setValue(`${fieldName}.city`, address.city);
          setValue(`${fieldName}.state`, address.state);
          setValue(`${fieldName}.pincode`, address.pincode);
          setValue(`${fieldName}.country`, address.country);

          // Store metadata if the form schema supports it
          // (These fields are only stored if they exist in the form definition)
          if (placeId) {
            try {
              setValue(`${fieldName}.placeId`, placeId);
            } catch {
              // Field doesn't exist, skip
            }
          }
          if (location) {
            try {
              setValue(`${fieldName}.latitude`, location.lat);
              setValue(`${fieldName}.longitude`, location.lng);
            } catch {
              // Fields don't exist, skip
            }
          }
        }
      } catch (err) {
        console.error("Failed to select suggestion:", err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [fieldName, setValue]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        // Close dropdown on Escape even if no suggestions
        if (e.key === "Escape") {
          setIsOpen(false);
          setSuggestions([]);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSelectSuggestion(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSuggestions([]);
          setSelectedIndex(-1);
          break;
        default:
          break;
      }
    },
    [isOpen, suggestions, selectedIndex, handleSelectSuggestion]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSuggestions([]);
        setSelectedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return (
    <div className="relative">
      <Controller
        name={`${fieldName}.addressLine1`}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type="text"
            placeholder={placeholder}
            error={error}
            disabled={disabled || isLoading}
            readOnly={readonly}
            autoComplete="off"
            onChange={(e) => {
              field.onChange(e);
              if (!readonly && !disabled) {
                handleInputChange(e);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            className={cn(
              isLoading && "opacity-75",
              isOpen && "rounded-b-none border-b-0"
            )}
          />
        )}
      />

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={cn(
            "absolute top-full left-0 right-0 z-50",
            "border border-t-0 border-slate-200 bg-white rounded-b-lg shadow-lg",
            "max-h-64 overflow-y-auto"
          )}
        >
          {suggestions.map((suggestion, idx) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={cn(
                "w-full px-4 py-3 text-left text-sm transition-colors duration-150",
                "border-b border-slate-50 last:border-b-0",
                idx === selectedIndex
                  ? "bg-blue-50 text-blue-900"
                  : "hover:bg-slate-50 text-slate-900"
              )}
              disabled={isLoading}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {suggestion.mainText}
                  </div>
                  {suggestion.secondaryText && (
                    <div className="text-xs text-slate-500 truncate">
                      {suggestion.secondaryText}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Failed to fetch address suggestions. Please try again.</span>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Loading suggestions...</span>
        </div>
      )}

      {/* Google Attribution (required by Google) */}
      <div className="mt-1 text-[11px] text-slate-400">
        Powered by <span className="font-medium">Google Places</span>
      </div>
    </div>
  );
}
