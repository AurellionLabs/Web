import { Location } from '@/domain/shared';

/**
 * Validate that a Location has valid, non-zero coordinates
 */
function isValidLocation(loc: Location | null | undefined): boolean {
  if (!loc || !loc.lat || !loc.lng) return false;
  const lat = parseFloat(loc.lat);
  const lng = parseFloat(loc.lng);
  if (isNaN(lat) || isNaN(lng)) return false;
  // Reject (0, 0) — likely unset on-chain defaults
  if (lat === 0 && lng === 0) return false;
  // Basic bounds check
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

export async function calculateETA(
  origin: Location,
  destination: Location,
): Promise<number> {
  // Validate inputs before hitting the API
  if (!isValidLocation(origin) || !isValidLocation(destination)) {
    console.warn('[calculateETA] Skipping — invalid or missing coordinates:', {
      origin,
      destination,
    });
    return -1;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn(
      '[calculateETA] Skipping — NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set',
    );
    return -1;
  }

  try {
    const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;

    // Set departure time to 2 minutes in the future to ensure it's valid
    const departureTime = new Date();
    departureTime.setMinutes(departureTime.getMinutes() + 2);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: parseFloat(origin.lat),
              longitude: parseFloat(origin.lng),
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: parseFloat(destination.lat),
              longitude: parseFloat(destination.lng),
            },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        departureTime: departureTime.toISOString(),
        computeAlternativeRoutes: false,
        languageCode: 'en-US',
        units: 'METRIC',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.warn(
        '[calculateETA] Routes API error:',
        response.status,
        errorData,
      );
      return -1;
    }

    const data = await response.json();

    if (!data.routes?.[0]?.duration) {
      console.warn('[calculateETA] No routes returned for:', {
        origin,
        destination,
      });
      return -1;
    }

    // Convert duration from seconds to minutes and round up
    const durationInSeconds = parseInt(
      data.routes[0].duration.replace('s', ''),
    );
    return Math.ceil(durationInSeconds / 60);
  } catch (error) {
    console.warn(
      '[calculateETA] Failed:',
      error instanceof Error ? error.message : error,
    );
    return -1;
  }
}
