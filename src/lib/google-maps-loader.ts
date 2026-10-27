/**
 * Google Maps JavaScript API loader
 * Handles loading the Google Maps API with the Places API once and caching the instance.
 * Prevents duplicate API loads and provides type safety.
 */

let mapsApiPromise: Promise<typeof google> | null = null;

/**
 * Load the Google Maps JavaScript API with Places support.
 * Caches the result so multiple address components don't load the API repeatedly.
 *
 * @returns Promise that resolves to the google object when the API is loaded
 * @throws Error if the API key is not configured
 * @throws Error if the API fails to load
 */
export async function loadGoogleMapsApi(): Promise<typeof google> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  console.log("[GoogleMapsLoader] API Key present:", !!apiKey);

  if (!apiKey) {
    throw new Error(
      "Google Maps API key is not configured. " +
      "Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables."
    );
  }

  // Return cached promise if already loading or loaded
  if (mapsApiPromise) {
    return mapsApiPromise;
  }

  // Create the loading promise
  mapsApiPromise = new Promise((resolve, reject) => {
    // Check if API is already loaded (edge case where script tag was added externally)
    if (typeof window !== "undefined" && window.google?.maps) {
      resolve(window.google);
      return;
    }

    if (typeof window === "undefined") {
      reject(new Error("Google Maps API can only be loaded in the browser"));
      return;
    }

    // Create and inject the script tag
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps API loaded but window.google is not available"));
      }
    };

    script.onerror = () => {
      mapsApiPromise = null; // Reset cache on error so retry is possible
      reject(new Error("Failed to load Google Maps API"));
    };

    document.head.appendChild(script);
  });

  return mapsApiPromise;
}

/**
 * Unload the cached Google Maps API promise.
 * Useful for testing or manual cleanup (not typically needed in production).
 */
export function unloadGoogleMapsApi(): void {
  mapsApiPromise = null;
}
