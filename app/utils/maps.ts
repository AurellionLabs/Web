import { Location } from '@/domain/shared';

export async function calculateETA(
  origin: Location,
  destination: Location,
): Promise<number> {
  try {
    const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;

    // Set departure time to 2 minutes in the future to ensure it's valid
    const departureTime = new Date();
    departureTime.setMinutes(departureTime.getMinutes() + 2);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
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
      console.error('Routes API Error:', errorData);
      throw new Error('Cannot calculate ETA for this route');
    }

    const data = await response.json();
    console.log('routes api data', data);

    if (!data.routes?.[0]?.duration) {
      throw new Error('Cannot calculate ETA for this route');
    }

    // Convert duration from seconds to minutes and round up
    const durationInSeconds = parseInt(
      data.routes[0].duration.replace('s', ''),
    );
    return Math.ceil(durationInSeconds / 60);
  } catch (error) {
    console.error('Error calculating ETA:', error);
    throw new Error('Cannot calculate ETA for this route');
  }
}
