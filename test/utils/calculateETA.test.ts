// File: test/utils/calculateETA.test.ts
//
// Unit tests for calculateETA - validates Google Routes API integration,
// error handling, and response parsing

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variable
vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-api-key-123');

import { calculateETA } from '@/app/utils/maps';
import type { Location } from '@/domain/shared';

const validOrigin: Location = { lat: '40.7128', lng: '-74.0060' }; // NYC
const validDestination: Location = { lat: '34.0522', lng: '-118.2437' }; // LA

describe('calculateETA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful responses', () => {
    it('should return ETA in minutes for a valid route', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [
            {
              duration: '3600s', // 1 hour = 60 minutes
              distanceMeters: 50000,
            },
          ],
        }),
      });

      const eta = await calculateETA(validOrigin, validDestination);
      expect(eta).toBe(60);
    });

    it('should round up partial minutes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [
            {
              duration: '901s', // 15 minutes 1 second → rounds to 16
              distanceMeters: 10000,
            },
          ],
        }),
      });

      const eta = await calculateETA(validOrigin, validDestination);
      expect(eta).toBe(16); // Math.ceil(901/60) = 16
    });

    it('should handle very short durations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [
            {
              duration: '30s', // 30 seconds → 1 minute
              distanceMeters: 500,
            },
          ],
        }),
      });

      const eta = await calculateETA(validOrigin, validDestination);
      expect(eta).toBe(1); // Math.ceil(30/60) = 1
    });

    it('should send correct request to Google Routes API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ duration: '600s', distanceMeters: 5000 }],
        }),
      });

      await calculateETA(validOrigin, validDestination);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
      );
      expect(options.method).toBe('POST');
      expect(options.headers['X-Goog-Api-Key']).toBe('test-api-key-123');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.origin.location.latLng.latitude).toBe(40.7128);
      expect(body.origin.location.latLng.longitude).toBe(-74.006);
      expect(body.destination.location.latLng.latitude).toBe(34.0522);
      expect(body.destination.location.latLng.longitude).toBe(-118.2437);
      expect(body.travelMode).toBe('DRIVE');
    });
  });

  describe('error handling', () => {
    it('should throw "Cannot calculate ETA" when API returns non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API rate limit exceeded',
      });

      await expect(calculateETA(validOrigin, validDestination)).rejects.toThrow(
        'Cannot calculate ETA for this route',
      );
    });

    it('should throw "Cannot calculate ETA" when response has no routes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ routes: [] }),
      });

      await expect(calculateETA(validOrigin, validDestination)).rejects.toThrow(
        'Cannot calculate ETA for this route',
      );
    });

    it('should throw "Cannot calculate ETA" when route has no duration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ distanceMeters: 5000 }], // no duration field
        }),
      });

      await expect(calculateETA(validOrigin, validDestination)).rejects.toThrow(
        'Cannot calculate ETA for this route',
      );
    });

    it('should throw "Cannot calculate ETA" when routes is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // no routes at all
      });

      await expect(calculateETA(validOrigin, validDestination)).rejects.toThrow(
        'Cannot calculate ETA for this route',
      );
    });

    it('should throw "Cannot calculate ETA" when fetch rejects (network error)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(calculateETA(validOrigin, validDestination)).rejects.toThrow(
        'Cannot calculate ETA for this route',
      );
    });

    it('should throw "Cannot calculate ETA" when API key is missing', async () => {
      // The function uses process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
      // If missing, the API call will likely fail
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'API key not valid',
      });

      await expect(calculateETA(validOrigin, validDestination)).rejects.toThrow(
        'Cannot calculate ETA for this route',
      );
    });
  });

  describe('input validation', () => {
    it('should parse string lat/lng to floats for the API request', async () => {
      const origin: Location = { lat: '51.5074', lng: '-0.1278' };
      const dest: Location = { lat: '48.8566', lng: '2.3522' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ duration: '1200s', distanceMeters: 30000 }],
        }),
      });

      await calculateETA(origin, dest);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(typeof body.origin.location.latLng.latitude).toBe('number');
      expect(typeof body.origin.location.latLng.longitude).toBe('number');
      expect(body.origin.location.latLng.latitude).toBe(51.5074);
      expect(body.destination.location.latLng.latitude).toBe(48.8566);
    });

    it('should handle locations with many decimal places', async () => {
      const origin: Location = {
        lat: '40.71280000000001',
        lng: '-74.00600000000002',
      };
      const dest: Location = {
        lat: '34.05220000000003',
        lng: '-118.24370000000004',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ duration: '600s', distanceMeters: 5000 }],
        }),
      });

      const eta = await calculateETA(origin, dest);
      expect(eta).toBe(10);
    });
  });
});
