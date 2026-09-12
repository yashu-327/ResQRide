import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export interface RealHospital {
  id: string;
  name: string;
  distance: string;
  distanceMeters: number;
  mapsUrl: string;
}

export type FetchHospitalsResult =
  | { status: 'success'; hospitals: RealHospital[] }
  | { status: 'missing_config'; hospitals: [] }
  | { status: 'error'; message: string; hospitals: [] };

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Searches for real nearby hospitals using the Google Maps Places library (Places API New).
 * Only returns genuine hospital places returned by the service.
 * If API key is missing or service is unavailable, returns appropriate status.
 */
export async function fetchRealNearbyHospitals(
  lat: number,
  lng: number
): Promise<FetchHospitalsResult> {
  const apiKey = (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env
    ?.VITE_GOOGLE_MAPS_API_KEY;

  if (
    !apiKey ||
    typeof apiKey !== 'string' ||
    apiKey.trim() === '' ||
    apiKey === 'MY_GOOGLE_MAPS_API_KEY'
  ) {
    return { status: 'missing_config', hospitals: [] };
  }

  try {
    setOptions({
      key: apiKey.trim(),
      v: 'weekly',
    });

    const placesLib = (await importLibrary('places')) as any;
    const Place = placesLib.Place;

    if (!Place || typeof Place.searchNearby !== 'function') {
      return { status: 'error', message: 'Place.searchNearby not available', hospitals: [] };
    }

    // Use Places API (New) searchNearby with type 'hospital'
    const request = {
      fields: ['displayName', 'location', 'id', 'googleMapsURI'],
      locationRestriction: {
        center: { lat, lng },
        radius: 15000, // 15 km radius
      },
      includedTypes: ['hospital'],
      maxResultCount: 10,
    };

    const response = await Place.searchNearby(request);
    const places = response.places || [];

    if (!places || places.length === 0) {
      return { status: 'error', message: 'No hospitals found nearby.', hospitals: [] };
    }

    const hospitals: RealHospital[] = places
      .map((place: any) => {
        const placeLat = typeof place.location?.lat === 'function' ? place.location.lat() : place.location?.lat;
        const placeLng = typeof place.location?.lng === 'function' ? place.location.lng() : place.location?.lng;
        const name =
          typeof place.displayName === 'string'
            ? place.displayName
            : place.displayName?.text || place.displayName || 'Hospital';

        const distanceMeters =
          placeLat !== undefined && placeLng !== undefined
            ? calculateDistanceMeters(lat, lng, placeLat, placeLng)
            : 0;

        const mapsUrl =
          place.googleMapsURI ||
          (placeLat !== undefined && placeLng !== undefined
            ? `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${placeLat},${placeLng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`);

        return {
          id: place.id || `${placeLat}-${placeLng}-${Math.random()}`,
          name,
          distance: formatDistance(distanceMeters),
          distanceMeters,
          mapsUrl,
        };
      })
      .sort((a: RealHospital, b: RealHospital) => a.distanceMeters - b.distanceMeters);

    return { status: 'success', hospitals };
  } catch (error) {
    console.warn('Could not load hospitals from Google Places:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to query Places API',
      hospitals: [],
    };
  }
}
