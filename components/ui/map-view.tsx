'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  lat: string;
  lng: string;
  addressName: string;
}

export function MapView({ lat, lng, addressName }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    const map = new mapboxgl.Map({
      container: mapRef.current!,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme similar to Uber
      center: [parseFloat(lng), parseFloat(lat)],
      zoom: 14,
      pitch: 45, // Tilted view
      bearing: -17.6,
    });

    // Add 3D building layer
    map.on('load', () => {
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6,
        },
      });
    });

    // Add marker
    new mapboxgl.Marker({
      color: '#FF5733', // Custom marker color
    })
      .setLngLat([parseFloat(lng), parseFloat(lat)])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>${addressName}</h3>`))
      .addTo(map);

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl());

    return () => map.remove();
  }, [lat, lng, addressName]);

  return (
    <div className="relative">
      <div ref={mapRef} className="w-full h-[600px] rounded-lg" />
      <div className="absolute bottom-4 left-4 bg-black/75 text-white p-3 rounded-lg">
        <h3 className="font-semibold">{addressName}</h3>
        <div className="text-sm text-gray-300">
          <p>Lat: {lat}</p>
          <p>Lng: {lng}</p>
        </div>
      </div>
    </div>
  );
}
